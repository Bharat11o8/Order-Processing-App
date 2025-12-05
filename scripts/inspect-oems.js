const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const oems = await prisma.oEM.findMany({
        include: {
            models: {
                take: 20 // Check first 20 models
            }
        }
    });

    console.log(JSON.stringify(oems, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
