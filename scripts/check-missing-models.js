const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_MODELS = [
    'BODY COVER', 'NET', 'BAG', 'BACK REST PAD', 'ROPES', 'GLOVES',
    'CHEST GUARD', 'DOCUMENT FOLDER', 'LED', 'MICROFIBER CLOTH',
    'MOBILE HOLDER', 'QUILTED SPIKE', 'QUILTING MAT', 'TANK BAG', 'TANK COVER'
];

async function main() {
    const otherOem = await prisma.oEM.findFirst({ where: { name: 'OTHER' } });
    if (!otherOem) return console.log('OTHER OEM not found');

    const existingModels = await prisma.model.findMany({
        where: { oemId: otherOem.id },
        select: { name: true }
    });
    const existingNames = existingModels.map(m => m.name);

    console.log('Existing Models:', existingNames.length);

    const missing = TARGET_MODELS.filter(tm => !existingNames.includes(tm));
    console.log('Missing Target Models:', missing);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
