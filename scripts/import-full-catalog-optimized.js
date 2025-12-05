const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting OPTIMIZED full catalog import from DB 1.csv...');
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

    // Find all OEMs except OTHER
    const oemsToDelete = await prisma.oEM.findMany({
        where: { name: { not: 'OTHER' } }
    });
    const oemIds = oemsToDelete.map(o => o.id);

    if (oemIds.length > 0) {
        console.log(`Deleting data for ${oemIds.length} OEMs...`);

        // 1. Delete OrderItems
        console.log('Deleting OrderItems...');
        await prisma.orderItem.deleteMany({
            where: { design: { model: { oemId: { in: oemIds } } } }
        });

        // 2. Delete ProductVariants
        console.log('Deleting ProductVariants...');
        await prisma.productVariant.deleteMany({
            where: { design: { model: { oemId: { in: oemIds } } } }
        });

        // 3. Delete DesignColors
        console.log('Deleting DesignColors...');
        await prisma.designColor.deleteMany({
            where: { design: { model: { oemId: { in: oemIds } } } }
        });

        // 4. Delete Designs
        console.log('Deleting Designs...');
        await prisma.design.deleteMany({
            where: { model: { oemId: { in: oemIds } } }
        });

        // 5. Delete Models
        console.log('Deleting Models...');
        await prisma.model.deleteMany({
            where: { oemId: { in: oemIds } }
        });

        // 6. Delete OEMs
        console.log('Deleting OEMs...');
        await prisma.oEM.deleteMany({
            where: { id: { in: oemIds } }
        });
    }
    console.log('Cleanup complete.');

    // 3. Prepare Data Structures
    const oemMap = new Map(); // name -> id
    const typeMap = new Map(); // name -> id
    const modelMap = new Map(); // key(name-oemId) -> id
    const designMap = new Map(); // key(name-modelId) -> id
    const colorMap = new Map(); // key(name-designId) -> id

    // Pre-load OTHER
    if (otherOem) oemMap.set('OTHER', otherOem.id);

    // Pre-load Types
    const existingTypes = await prisma.vehicleType.findMany();
    existingTypes.forEach(t => typeMap.set(t.name, t.id));

    // A. Collect Unique OEMs
    const uniqueOems = new Set();
    rows.forEach(row => {
        const name = row["OEM's"] || row["OEM's\r"];
        if (name) uniqueOems.add(name.replace(/['"]+/g, '').trim());
    });
    uniqueOems.delete('OTHER'); // Don't touch OTHER

    // Upsert OEMs
    console.log(`Upserting ${uniqueOems.size} OEMs...`);
    for (const name of uniqueOems) {
        if (!oemMap.has(name)) {
            const oem = await prisma.oEM.upsert({
                where: { name },
                update: {},
                create: { name }
            });
            oemMap.set(name, oem.id);
        }
    }

    // B. Collect Unique Types
    const uniqueTypes = new Set();
    rows.forEach(row => {
        const name = row['VEHICLE TYPE'];
        if (name) uniqueTypes.add(name.replace(/['"]+/g, '').trim());
    });
    // Default fallback
    uniqueTypes.add('SCOOTER');

    // Upsert Types
    console.log(`Upserting ${uniqueTypes.size} Vehicle Types...`);
    for (const name of uniqueTypes) {
        if (!typeMap.has(name)) {
            const type = await prisma.vehicleType.upsert({
                where: { name },
                update: {},
                create: { name }
            });
            typeMap.set(name, type.id);
        }
    }

    // C. Collect Unique Models
    // We need to process rows to link Model -> OEM + Type
    // If a model appears with multiple types, we take the last one or first one? Usually consistent.
    const modelDefinitions = new Map(); // key -> { name, oemId, typeId }

    rows.forEach(row => {
        const oemName = (row["OEM's"] || row["OEM's\r"]).replace(/['"]+/g, '').trim();
        if (oemName === 'OTHER') return;

        const modelName = row['ITEMS'].replace(/['"]+/g, '').trim();
        const typeName = (row['VEHICLE TYPE'] || 'SCOOTER').replace(/['"]+/g, '').trim();

        const oemId = oemMap.get(oemName);
        const typeId = typeMap.get(typeName);

        if (oemId && typeId && modelName) {
            const key = `${modelName}-${oemId}`;
            modelDefinitions.set(key, { name: modelName, oemId, vehicleTypeId: typeId });
        }
    });
    // Upsert Models
    console.log(`Upserting ${modelDefinitions.size} Models...`);
    const modelBatches = Array.from(modelDefinitions.values());
    const MODEL_BATCH_SIZE = 10;

    for (let i = 0; i < modelBatches.length; i += MODEL_BATCH_SIZE) {
        const batch = modelBatches.slice(i, i + MODEL_BATCH_SIZE);
        await Promise.all(batch.map(async (def) => {
            const model = await prisma.model.create({
                data: def
            });
            const key = `${def.name}-${def.oemId}`;
            modelMap.set(key, model.id);
        }));
    }

    // D. Collect Unique Designs
    // Need to determine seatOption (SINGLE, DOUBLE, BOTH)
    const designDefinitions = new Map(); // key -> { name, modelId, seatOption, productCode }

    rows.forEach(row => {
        const oemName = (row["OEM's"] || row["OEM's\r"]).replace(/['"]+/g, '').trim();
        if (oemName === 'OTHER') return;

        const modelName = row['ITEMS'].replace(/['"]+/g, '').trim();
        const designName = row['PART NO.'].replace(/['"]+/g, '').trim();
        const seatRaw = (row['SEAT'] || '').replace(/['"]+/g, '').trim().toUpperCase();

        const oemId = oemMap.get(oemName);
        const modelKey = `${modelName}-${oemId}`;
        const modelId = modelMap.get(modelKey);

        if (modelId && designName) {
            const key = `${designName}-${modelId}`;

            let seatOption = 'BOTH'; // Default
            if (seatRaw === 'SINGLE') seatOption = 'SINGLE';
            if (seatRaw === 'DOUBLE' || seatRaw === 'DUAL') seatOption = 'DOUBLE';

            if (designDefinitions.has(key)) {
                // Merge seat option
                const existing = designDefinitions.get(key);
                if (existing.seatOption !== 'BOTH' && existing.seatOption !== seatOption) {
                    existing.seatOption = 'BOTH';
                }
            } else {
                const designBaseCode = `${designName}-${modelName}`.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
                designDefinitions.set(key, {
                    name: designName,
                    modelId,
                    seatOption,
                    productCode: designBaseCode,
                    unitType: 'PCS'
                });
            }
        }
    });

    // Upsert Designs
    console.log(`Upserting ${designDefinitions.size} Designs...`);
    const designBatches = Array.from(designDefinitions.values());
    const DESIGN_BATCH_SIZE = 5; // Reduced to 5

    for (let i = 0; i < designBatches.length; i += DESIGN_BATCH_SIZE) {
        const batch = designBatches.slice(i, i + DESIGN_BATCH_SIZE);
        await Promise.all(batch.map(async (def) => {
            // Use upsert just in case, though we cleaned up
            const design = await prisma.design.create({
                data: def
            });
            const key = `${def.name}-${def.modelId}`;
            designMap.set(key, design.id);
        }));
        // Small delay to release connections
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // E. Collect Colors & Variants
    const colorDefinitions = new Map(); // key -> { name, designId, code }
    const variantDefinitions = [];

    rows.forEach(row => {
        const oemName = (row["OEM's"] || row["OEM's\r"]).replace(/['"]+/g, '').trim();
        if (oemName === 'OTHER') return;

        const modelName = row['ITEMS'].replace(/['"]+/g, '').trim();
        const designName = row['PART NO.'].replace(/['"]+/g, '').trim();
        const colorName = (row['COLOUR'] || 'Generic').replace(/['"]+/g, '').trim();
        const variantCode = row['CODE'].replace(/['"]+/g, '').trim();
        const seatRaw = (row['SEAT'] || '').replace(/['"]+/g, '').trim().toUpperCase();

        const oemId = oemMap.get(oemName);
        const modelKey = `${modelName}-${oemId}`;
        const modelId = modelMap.get(modelKey);
        const designKey = `${designName}-${modelId}`;
        const designId = designMap.get(designKey);

        if (designId && variantCode) {
            // Color
            const colorKey = `${colorName}-${designId}`;
            if (!colorDefinitions.has(colorKey)) {
                colorDefinitions.set(colorKey, {
                    name: colorName,
                    designId,
                    code: colorName.substring(0, 2).toUpperCase()
                });
            }

            // Variant (we need colorId, so we'll process variants after creating colors)
            let variantSeat = null;
            if (seatRaw === 'SINGLE') variantSeat = 'SINGLE';
            if (seatRaw === 'DOUBLE' || seatRaw === 'DUAL') variantSeat = 'DOUBLE';

            variantDefinitions.push({
                productCode: variantCode,
                designId,
                colorKey, // Temp link
                seatType: variantSeat
            });
        }
    });

    // Upsert Colors
    console.log(`Upserting ${colorDefinitions.size} Colors...`);
    const colorBatches = Array.from(colorDefinitions.values());

    for (let i = 0; i < colorBatches.length; i += MODEL_BATCH_SIZE) {
        const batch = colorBatches.slice(i, i + MODEL_BATCH_SIZE);
        await Promise.all(batch.map(async (def) => {
            const color = await prisma.designColor.create({
                data: def
            });
            const key = `${def.name}-${def.designId}`;
            colorMap.set(key, color.id);
        }));
    }

    // Upsert Variants
    console.log(`Upserting ${variantDefinitions.length} Variants...`);
    const variantBatches = [];
    for (let i = 0; i < variantDefinitions.length; i += MODEL_BATCH_SIZE) {
        variantBatches.push(variantDefinitions.slice(i, i + MODEL_BATCH_SIZE));
    }

    for (const batch of variantBatches) {
        await Promise.all(batch.map(async (def) => {
            const colorId = colorMap.get(def.colorKey);
            try {
                await prisma.productVariant.upsert({
                    where: { productCode: def.productCode },
                    update: {
                        designId: def.designId,
                        colorId: colorId,
                        seatType: def.seatType
                    },
                    create: {
                        productCode: def.productCode,
                        designId: def.designId,
                        colorId: colorId,
                        seatType: def.seatType
                    }
                });
            } catch (e) {
                if (e.code === 'P2002') {
                    console.log(`Skipping duplicate variant: Code=${def.productCode} (Design=${def.designId}, Color=${colorId}, Seat=${def.seatType})`);
                } else {
                    throw e;
                }
            }
        }));
    }

    console.log('Import complete!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
