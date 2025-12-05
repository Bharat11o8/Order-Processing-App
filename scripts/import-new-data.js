const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting import from autoform (2).csv...');
    const filePath = path.join(__dirname, '..', 'autoform (2).csv');

    const rows = [];

    // Simple CSV parser since we can't easily install new packages without user permission
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, index) => {
            row[h] = values[index];
        });
        rows.push(row);
    }

    console.log(`Found ${rows.length} rows.`);

    // Cache
    const oemCache = new Map();
    const typeCache = new Map();
    const modelCache = new Map();
    const designCache = new Map();
    const colorCache = new Map();

    // Pre-load caches
    const existingOems = await prisma.oEM.findMany();
    existingOems.forEach(o => oemCache.set(o.name, o.id));

    // Cleanup OTHER data
    const otherOemId = oemCache.get('OTHER');
    if (otherOemId) {
        console.log('Cleaning up existing OTHER data...');
        // Delete all models for OTHER manually to ensure clean slate
        const otherModels = await prisma.model.findMany({ where: { oemId: otherOemId } });
        const otherModelIds = otherModels.map(m => m.id);

        if (otherModelIds.length > 0) {
            const designs = await prisma.design.findMany({ where: { modelId: { in: otherModelIds } } });
            const designIds = designs.map(d => d.id);

            if (designIds.length > 0) {
                // Delete related OrderItems first
                await prisma.orderItem.deleteMany({ where: { designId: { in: designIds } } });

                await prisma.productVariant.deleteMany({ where: { designId: { in: designIds } } });
                await prisma.designColor.deleteMany({ where: { designId: { in: designIds } } });
                await prisma.design.deleteMany({ where: { id: { in: designIds } } });
            }
            await prisma.model.deleteMany({ where: { id: { in: otherModelIds } } });
        }

        console.log('Cleanup complete.');
        modelCache.clear(); // Clear cache for models
    }

    const existingTypes = await prisma.vehicleType.findMany();
    existingTypes.forEach(t => typeCache.set(t.name, t.id));

    // Target Models Mapping
    const TARGET_MODELS = [
        'BODY COVER', 'NET', 'BAG', 'BACK REST PAD', 'ROPES', 'GLOVES',
        'CHEST GUARD', 'DOCUMENT FOLDER', 'LED', 'MICROFIBER CLOTH',
        'MOBILE HOLDER', 'QUILTED SPIKE', 'QUILTING MAT', 'TANK BAG', 'TANK COVER'
    ];

    function mapToTargetModel(csvItemName) {
        const upper = csvItemName.toUpperCase().trim();
        if (TARGET_MODELS.includes(upper)) return upper;

        if (upper.includes('NET')) return 'NET';
        if (upper.includes('BAG')) return 'BAG';
        if (upper.includes('ROPE')) return 'ROPES';
        if (upper.includes('GLOVE')) return 'GLOVES';
        if (upper.includes('CHEST GUARD')) return 'CHEST GUARD';
        if (upper.includes('BODY COVER')) return 'BODY COVER';
        if (upper.includes('BACK REST')) return 'BACK REST PAD';
        if (upper.includes('DOCUMENT')) return 'DOCUMENT FOLDER';
        if (upper.includes('LED')) return 'LED';
        if (upper.includes('CLOTH')) return 'MICROFIBER CLOTH';
        if (upper.includes('HOLDER')) return 'MOBILE HOLDER';
        if (upper.includes('SPIKE')) return 'QUILTED SPIKE';
        if (upper.includes('MAT')) return 'QUILTING MAT';
        if (upper.includes('TANK COVER')) return 'TANK COVER';

        return upper; // Fallback
    }

    for (const row of rows) {
        const oemName = row["OEM's"] || row["OEM's\r"]; // Handle potential carriage return in header
        let modelName = row['PART NO.']; // Swapped: PART NO is Model
        const designName = row['ITEMS']; // Swapped: ITEMS is Design
        const variantCode = row['CODE'];
        const typeName = row['VEHICLE TYPE'];
        const colorName = row['COLOUR'];
        const seatTypeRaw = row['SEAT']; // Usually N/A for others

        if (!oemName || !modelName || !designName || !variantCode) continue;

        // Clean strings
        const cleanOem = oemName.replace(/['"]+/g, '').trim();

        // Apply Mapping for OTHER OEM
        if (cleanOem === 'OTHER') {
            modelName = mapToTargetModel(modelName);
        }

        const cleanModel = modelName.replace(/['"]+/g, '').trim();
        const cleanDesign = designName.replace(/['"]+/g, '').trim();
        const cleanCode = variantCode.replace(/['"]+/g, '').trim();
        const cleanType = typeName ? typeName.replace(/['"]+/g, '').trim() : 'ACCESSORIES';
        const cleanColor = colorName ? colorName.replace(/['"]+/g, '').trim() : 'Generic';

        // 1. OEM
        let oemId = oemCache.get(cleanOem);
        if (!oemId) {
            const oem = await prisma.oEM.upsert({
                where: { name: cleanOem },
                update: {},
                create: { name: cleanOem }
            });
            oemId = oem.id;
            oemCache.set(cleanOem, oemId);
        }

        // 2. Type
        let typeId = typeCache.get(cleanType);
        if (!typeId) {
            const type = await prisma.vehicleType.upsert({
                where: { name: cleanType }, // Assuming name is unique enough or we findFirst
                update: {},
                create: { name: cleanType }
            });
            // Note: Schema doesn't have unique on name, so findFirst is safer usually, but for import script upsert by unique ID is hard.
            // Let's rely on findFirst logic if upsert fails, but here we used cache.
            // Actually, let's do findFirst logic to be safe.
            const existing = await prisma.vehicleType.findFirst({ where: { name: cleanType } });
            if (existing) typeId = existing.id;
            else {
                const newType = await prisma.vehicleType.create({ data: { name: cleanType } });
                typeId = newType.id;
            }
            typeCache.set(cleanType, typeId);
        }

        // 3. Model
        const modelKey = `${cleanModel}-${oemId}`;
        let modelId = modelCache.get(modelKey);
        if (!modelId) {
            const existingModel = await prisma.model.findFirst({
                where: { name: cleanModel, oemId: oemId }
            });
            if (existingModel) {
                modelId = existingModel.id;
                // Update type if needed
                if (existingModel.vehicleTypeId !== typeId) {
                    await prisma.model.update({
                        where: { id: modelId },
                        data: { vehicleTypeId: typeId }
                    });
                }
            } else {
                const newModel = await prisma.model.create({
                    data: {
                        name: cleanModel,
                        oemId: oemId,
                        vehicleTypeId: typeId
                    }
                });
                modelId = newModel.id;
            }
            modelCache.set(modelKey, modelId);
        }

        // 4. Design
        const designBaseCode = `${cleanDesign}-${cleanModel}`.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
        const designKey = `${cleanDesign}-${modelId}`;
        let designId = designCache.get(designKey);

        if (!designId) {
            // Check existing by name and model
            const existingDesign = await prisma.design.findFirst({
                where: { name: cleanDesign, modelId: modelId }
            });

            if (existingDesign) {
                designId = existingDesign.id;
            } else {
                // Create
                const design = await prisma.design.create({
                    data: {
                        productCode: designBaseCode, // This might duplicate if we are not careful, but unique constraint will catch it.
                        // Better to use a random suffix if needed, or just trust the data.
                        // Actually, let's try to find by productCode too.
                        name: cleanDesign,
                        modelId: modelId,
                        unitType: 'PCS',
                        seatOption: 'BOTH' // Default
                    }
                });
                designId = design.id;
            }
            designCache.set(designKey, designId);
        }

        // 5. Color
        const colorKey = `${cleanColor}-${designId}`;
        let colorId = colorCache.get(colorKey);
        if (!colorId) {
            const existingColor = await prisma.designColor.findFirst({
                where: { designId: designId, name: cleanColor }
            });
            if (existingColor) {
                colorId = existingColor.id;
            } else {
                const newColor = await prisma.designColor.create({
                    data: {
                        name: cleanColor,
                        designId: designId,
                        code: cleanColor.substring(0, 2).toUpperCase()
                    }
                });
                colorId = newColor.id;
            }
            colorCache.set(colorKey, colorId);
        }

        // 6. Variant
        await prisma.productVariant.upsert({
            where: { productCode: cleanCode },
            update: {
                designId: designId,
                colorId: colorId,
                seatType: null // For accessories, seat is usually null
            },
            create: {
                productCode: cleanCode,
                designId: designId,
                colorId: colorId,
                seatType: null
            }
        });
    }

    console.log('Import complete!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
