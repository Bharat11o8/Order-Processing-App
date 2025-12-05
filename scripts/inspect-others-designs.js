const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const othersOEM = await prisma.oEM.findFirst({
        where: { name: 'OTHERS' },
        include: {
            models: {
                include: {
                    designs: true
                }
            }
        }
    });

    if (othersOEM) {
        console.log(JSON.stringify(othersOEM, null, 2));
    } else {
        console.log('OTHERS OEM not found');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
