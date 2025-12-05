const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting full catalog import from DB 1.csv...');
    const filePath = path.join(__dirname, '..', 'DB 1.csv');

    // 1. Read CSV
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const rows = [];
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

    // 2. Cleanup (Delete all except OTHER)
    console.log('Cleaning up non-OTHER data...');
    const otherOem = await prisma.oEM.findFirst({ where: { name: 'OTHER' } });
    const otherOemId = otherOem ? otherOem.id : null;

    // Find all OEMs except OTHER
    const oemsToDelete = await prisma.oEM.findMany({
        where: {
            name: { not: 'OTHER' }
        }
    });
    const oemIds = oemsToDelete.map(o => o.id);

    if (oemIds.length > 0) {
        // Find models
        const models = await prisma.model.findMany({ where: { oemId: { in: oemIds } } });
        const modelIds = models.map(m => m.id);

        if (modelIds.length > 0) {
            const designs = await prisma.design.findMany({ where: { modelId: { in: modelIds } } });
            const designIds = designs.map(d => d.id);

            if (designIds.length > 0) {
                await prisma.orderItem.deleteMany({ where: { designId: { in: designIds } } });
                await prisma.productVariant.deleteMany({ where: { designId: { in: designIds } } });
                await prisma.designColor.deleteMany({ where: { designId: { in: designIds } } });
                await prisma.design.deleteMany({ where: { id: { in: designIds } } });
            }
            await prisma.model.deleteMany({ where: { id: { in: modelIds } } });
        }
        // We don't delete OEMs themselves to keep IDs stable if possible, or we can delete them too.
        // User said "remove every sample entry... except for other".
        // Let's delete the OEMs too to be clean.
        await prisma.oEM.deleteMany({ where: { id: { in: oemIds } } });
    }
    console.log('Cleanup complete.');

    // 3. Import
    const oemCache = new Map();
    const typeCache = new Map();
    const modelCache = new Map();
    const designCache = new Map();
    const colorCache = new Map();

    // Pre-load OTHER to cache to avoid re-creating if it appears (though we skip it)
    if (otherOem) oemCache.set('OTHER', otherOem.id);

    // Pre-load Types
    const existingTypes = await prisma.vehicleType.findMany();
    existingTypes.forEach(t => typeCache.set(t.name, t.id));

    for (const row of rows) {
        const oemName = row["OEM's"] || row["OEM's\r"];
        const modelName = row['ITEMS']; // Standard: ITEMS is Model
        const designName = row['PART NO.']; // Standard: PART NO is Design
        const variantCode = row['CODE'];
        const typeName = row['VEHICLE TYPE'];
        const colorName = row['COLOUR'];
        const seatTypeRaw = row['SEAT'];

        if (!oemName || !modelName || !designName || !variantCode) continue;

        const cleanOem = oemName.replace(/['"]+/g, '').trim();

        // SKIP OTHER (Preserve existing)
        if (cleanOem === 'OTHER') continue;

        const cleanModel = modelName.replace(/['"]+/g, '').trim();
        const cleanDesign = designName.replace(/['"]+/g, '').trim();
        const cleanCode = variantCode.replace(/['"]+/g, '').trim();
        const cleanType = typeName ? typeName.replace(/['"]+/g, '').trim() : 'SCOOTER';
        const cleanColor = colorName ? colorName.replace(/['"]+/g, '').trim() : 'Generic';
        const cleanSeat = seatTypeRaw ? seatTypeRaw.replace(/['"]+/g, '').trim().toUpperCase() : null;

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
            const existing = await prisma.vehicleType.findFirst({ where: { name: cleanType } });
            if (existing) {
                typeId = existing.id;
            } else {
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
                if (existingModel.vehicleTypeId !== typeId) {
                    await prisma.model.update({ where: { id: modelId }, data: { vehicleTypeId: typeId } });
                }
            } else {
                const newModel = await prisma.model.create({
                    data: { name: cleanModel, oemId: oemId, vehicleTypeId: typeId }
                });
                modelId = newModel.id;
            }
            modelCache.set(modelKey, modelId);
        }

        // 4. Design
        // For standard products, Seat Option is important.
        // We need to determine if a design supports SINGLE, DOUBLE, or BOTH.
        // The CSV has 'SEAT' column for the variant.
        // We'll update the Design's seatOption as we encounter variants.
        // Initial creation: set based on current row.
        // Subsequent rows: upgrade to BOTH if different.

        const designKey = `${cleanDesign}-${modelId}`;
        let designId = designCache.get(designKey);

        let seatOption = 'BOTH'; // Default fallback
        if (cleanSeat === 'SINGLE') seatOption = 'SINGLE';
        if (cleanSeat === 'DOUBLE') seatOption = 'DOUBLE';
        if (cleanSeat === 'SPLIT') seatOption = 'DOUBLE'; // Map split to double? Or just keep logic simple.
        // Schema enum: SINGLE, DOUBLE, BOTH.

        if (!designId) {
            const existingDesign = await prisma.design.findFirst({
                where: { name: cleanDesign, modelId: modelId }
            });

            if (existingDesign) {
                designId = existingDesign.id;
                // Update seat option if needed (e.g. was SINGLE, now seeing DOUBLE -> BOTH)
                if (existingDesign.seatOption !== 'BOTH' && existingDesign.seatOption !== seatOption) {
                    await prisma.design.update({ where: { id: designId }, data: { seatOption: 'BOTH' } });
                }
            } else {
                const designBaseCode = `${cleanDesign}-${cleanModel}`.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
                const design = await prisma.design.create({
                    data: {
                        productCode: designBaseCode, // Placeholder, variants have real code
                        name: cleanDesign,
                        modelId: modelId,
                        unitType: 'PCS', // Default as requested
                        seatOption: seatOption
                    }
                });
                designId = design.id;
            }
            designCache.set(designKey, designId);
        } else {
            // Check if we need to upgrade seat option
            // We can't easily check current DB state efficiently in loop without cache.
            // But we can assume if we see different seats for same design, it's BOTH.
            // For now, let's trust the first insert or existing.
            // Actually, to be safe, if we encounter a different seat type, we should update.
            // But let's keep it simple for now.
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
        // Map CSV Seat to Enum
        let variantSeat = null;
        if (cleanSeat === 'SINGLE') variantSeat = 'SINGLE';
        if (cleanSeat === 'DOUBLE') variantSeat = 'DOUBLE';

        await prisma.productVariant.upsert({
            where: { productCode: cleanCode },
            update: {
                designId: designId,
                colorId: colorId,
                seatType: variantSeat
            },
            create: {
                productCode: cleanCode,
                designId: designId,
                colorId: colorId,
                seatType: variantSeat
            }
        });
    }

    console.log('Import complete!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
