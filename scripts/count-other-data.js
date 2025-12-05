const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const otherOem = await prisma.oEM.findFirst({
        where: { name: 'OTHER' },
        include: {
            models: {
                include: {
                    _count: {
                        select: { designs: true }
                    }
                }
            }
        }
    });

    if (!otherOem) {
        console.log('OTHER OEM not found');
        return;
    }

    console.log(`OEM: ${otherOem.name}`);
    console.log(`Total Models: ${otherOem.models.length}`);

    let totalDesigns = 0;
    otherOem.models.forEach(m => {
        console.log(`- ${m.name}: ${m._count.designs} designs`);
        totalDesigns += m._count.designs;
    });
    console.log(`Total Designs: ${totalDesigns}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
