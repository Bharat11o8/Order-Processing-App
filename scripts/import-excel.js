const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting import...');
    const filePath = path.join(__dirname, '..', 'build data for antigravity.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${data.length} rows.`);

    // Cache to avoid repeated DB calls
    const oemCache = new Map();
    const typeCache = new Map();
    const modelCache = new Map(); // Key: Name-OEMId
    const designCache = new Map(); // Key: Name-ModelId
    const colorCache = new Map(); // Key: Name-DesignId

    for (const row of data) {
        const oemName = row["OEM's"]?.trim();
        const modelName = row['ITEMS']?.trim();
        const typeName = row['VEHICLE TYPE']?.trim();
        const designName = row['PART NO.']?.trim();
        const variantCode = row['CODE']?.trim();
        const seatTypeRaw = row['SEAT']?.trim();
        const colorName = row['COLOUR']?.trim() || 'Generic';

        if (!oemName || !modelName || !typeName || !designName || !variantCode) {
            // console.warn('Skipping incomplete row:', row);
            continue;
        }

        // 1. OEM
        let oemId = oemCache.get(oemName);
        if (!oemId) {
            const oem = await prisma.oEM.upsert({
                where: { name: oemName },
                update: {},
                create: { name: oemName },
            });
            oemId = oem.id;
            oemCache.set(oemName, oemId);
        }

        // 2. VehicleType
        let typeId = typeCache.get(typeName);
        if (!typeId) {
            const existing = await prisma.vehicleType.findFirst({ where: { name: typeName } });
            if (existing) {
                typeId = existing.id;
            } else {
                const newType = await prisma.vehicleType.create({ data: { name: typeName } });
                typeId = newType.id;
            }
            typeCache.set(typeName, typeId);
        }

        // 3. Model
        const modelKey = `${modelName}-${oemId}`;
        let modelId = modelCache.get(modelKey);
        if (!modelId) {
            const existingModel = await prisma.model.findFirst({
                where: { name: modelName, oemId: oemId }
            });

            if (existingModel) {
                modelId = existingModel.id;
                // Update type if missing
                if (!existingModel.vehicleTypeId) {
                    await prisma.model.update({
                        where: { id: modelId },
                        data: { vehicleTypeId: typeId }
                    });
                }
            } else {
                const newModel = await prisma.model.create({
                    data: {
                        name: modelName,
                        oemId: oemId,
                        vehicleTypeId: typeId
                    }
                });
                modelId = newModel.id;
            }
            modelCache.set(modelKey, modelId);
        }

        // 4. Design
        // Design needs productCode (unique), name, modelId.
        const designBaseCode = `${designName}-${modelName}`.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
        const designKey = `${designName}-${modelId}`;

        let designId = designCache.get(designKey);
        if (!designId) {
            const design = await prisma.design.upsert({
                where: { productCode: designBaseCode },
                update: {
                    name: designName,
                    modelId: modelId,
                    unitType: 'PCS',
                    seatOption: 'BOTH'
                },
                create: {
                    productCode: designBaseCode,
                    name: designName,
                    modelId: modelId,
                    unitType: 'PCS',
                    seatOption: 'BOTH'
                }
            });
            designId = design.id;
            designCache.set(designKey, designId);
        }

        // 5. Color
        const colorKey = `${colorName}-${designId}`;
        let colorId = colorCache.get(colorKey);
        if (!colorId) {
            const existingColor = await prisma.designColor.findFirst({
                where: { designId: designId, name: colorName }
            });

            if (existingColor) {
                colorId = existingColor.id;
            } else {
                const newColor = await prisma.designColor.create({
                    data: {
                        name: colorName,
                        designId: designId,
                        code: colorName === 'Generic' ? null : colorName.substring(0, 2).toUpperCase()
                    }
                });
                colorId = newColor.id;
            }
            colorCache.set(colorKey, colorId);
        }

        // 6. ProductVariant
        let seatType = null;
        if (seatTypeRaw) {
            const s = seatTypeRaw.toUpperCase();
            if (s.includes('SINGLE')) seatType = 'SINGLE';
            else if (s.includes('DOUBLE') || s.includes('DUAL')) seatType = 'DOUBLE';
        }

        await prisma.productVariant.upsert({
            where: { productCode: variantCode },
            update: {
                designId: designId,
                colorId: colorId,
                seatType: seatType
            },
            create: {
                productCode: variantCode,
                designId: designId,
                colorId: colorId,
                seatType: seatType
            }
        });
    }

    console.log('Import complete!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
