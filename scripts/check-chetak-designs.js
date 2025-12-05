const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const chetakModels = await prisma.model.findMany({
        where: {
            name: { contains: 'CHETAK', mode: 'insensitive' }
        },
        include: {
            oem: true,
            designs: true
        }
    });

    console.log('Found Chetak Models:', chetakModels.length);
    chetakModels.forEach(m => {
        console.log(`\nModel: [${m.oem.name}] ${m.name}`);
        m.designs.forEach(d => {
            if (d.name.includes('MAT') || d.name.includes('SPIKE')) {
                console.log(`  - Design: ${d.name} (Seat: ${d.seatOption})`);
            }
        });
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
