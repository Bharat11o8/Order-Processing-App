const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const models = await prisma.model.findMany({
        where: {
            OR: [
                { name: { contains: 'MAT', mode: 'insensitive' } },
                { name: { contains: 'SPIKE', mode: 'insensitive' } }
            ]
        },
        include: {
            oem: true
        }
    });

    console.log('Found Models:', models.length);
    models.forEach(m => {
        console.log(`- [${m.oem.name}] ${m.name} (ID: ${m.id})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
