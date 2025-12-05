const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const oems = await prisma.oEM.count();
    const types = await prisma.vehicleType.count();
    const models = await prisma.model.count();
    const designs = await prisma.design.count();
    const variants = await prisma.productVariant.count();

    console.log('Counts:');
    console.log(`OEMs: ${oems}`);
    console.log(`VehicleTypes: ${types}`);
    console.log(`Models: ${models}`);
    console.log(`Designs: ${designs}`);
    console.log(`ProductVariants: ${variants}`);

    if (models > 0) {
        console.log('\nSample Models:');
        const sampleModels = await prisma.model.findMany({ take: 5, include: { vehicleType: true } });
        console.log(sampleModels);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
