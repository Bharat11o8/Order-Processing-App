const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const variant = await prisma.productVariant.findUnique({
        where: { productCode: 'AFBJS108' },
        include: {
            design: {
                include: {
                    model: {
                        include: { oem: true }
                    }
                }
            },
            color: true
        }
    });
    console.log(JSON.stringify(variant, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
