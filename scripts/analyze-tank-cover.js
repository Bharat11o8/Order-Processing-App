const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const filePath = path.join(__dirname, '..', 'autoform (2).csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    const csvTankCovers = new Set();
    let totalOtherRows = 0;

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const oemName = values[0].replace(/['"]+/g, '').trim();
        const designName = values[3].replace(/['"]+/g, '').trim(); // ITEMS
        const modelName = values[1].replace(/['"]+/g, '').trim(); // PART NO

        if (oemName === 'OTHER') {
            totalOtherRows++;
            if (modelName.includes('TANK COVER')) {
                csvTankCovers.add(designName);
            }
        }
    }

    console.log(`Total 'OTHER' Rows (Variants) in CSV: ${totalOtherRows}`);
    console.log('CSV TANK COVER Designs:', Array.from(csvTankCovers).sort());

    const otherOem = await prisma.oEM.findFirst({ where: { name: 'OTHER' } });
    if (otherOem) {
        const tankCoverModel = await prisma.model.findFirst({
            where: { oemId: otherOem.id, name: 'TANK COVER' },
            include: { designs: true }
        });

        if (tankCoverModel) {
            const dbDesigns = tankCoverModel.designs.map(d => d.name).sort();
            console.log('DB TANK COVER Designs:', dbDesigns);

            const missing = Array.from(csvTankCovers).filter(d => !dbDesigns.includes(d));
            console.log('Missing in DB:', missing);
        } else {
            console.log('TANK COVER model not found in DB');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
