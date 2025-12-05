const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Importing missing row...');

    // Data from CSV: OTHER,TANK COVER,AFUTC01,UNIVERSAL TANK COVER 100 CC,ACCESSORIES,Generic,N/A
    const oemName = 'OTHER';
    const modelName = 'TANK COVER';
    const designName = 'UNIVERSAL TANK COVER 100 CC';
    const variantCode = 'AFUTC01';
    const typeName = 'ACCESSORIES';
    const colorName = 'Generic';

    // 1. Get IDs
    const oem = await prisma.oEM.findFirst({ where: { name: oemName } });
    if (!oem) throw new Error('OEM not found');

    const type = await prisma.vehicleType.findFirst({ where: { name: typeName } });
    if (!type) throw new Error('Type not found');

    const model = await prisma.model.findFirst({ where: { name: modelName, oemId: oem.id } });
    if (!model) throw new Error('Model not found');

    // 2. Create Design
    const designBaseCode = `${designName}-${modelName}`.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
    console.log(`Design Code: ${designBaseCode}`);

    let design = await prisma.design.findFirst({ where: { name: designName, modelId: model.id } });
    if (!design) {
        console.log('Creating Design...');
        design = await prisma.design.create({
            data: {
                productCode: designBaseCode,
                name: designName,
                modelId: model.id,
                unitType: 'PCS',
                seatOption: 'BOTH'
            }
        });
    } else {
        console.log('Design already exists');
    }

    // 3. Create Color
    let color = await prisma.designColor.findFirst({ where: { designId: design.id, name: colorName } });
    if (!color) {
        console.log('Creating Color...');
        color = await prisma.designColor.create({
            data: {
                name: colorName,
                designId: design.id,
                code: 'GE'
            }
        });
    }

    // 4. Create Variant
    console.log('Creating Variant...');
    await prisma.productVariant.upsert({
        where: { productCode: variantCode },
        update: {},
        create: {
            productCode: variantCode,
            designId: design.id,
            colorId: color.id
        }
    });

    console.log('Done!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
