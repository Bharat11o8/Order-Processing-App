const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const TARGET_MODELS = [
    'BODY COVER', 'NET', 'BAG', 'BACK REST PAD', 'ROPES', 'GLOVES',
    'CHEST GUARD', 'DOCUMENT FOLDER', 'LED', 'MICROFIBER CLOTH',
    'MOBILE HOLDER', 'QUILTED SPIKE', 'QUILTING MAT', 'TANK BAG', 'TANK COVER'
];

function mapToTargetModel(csvItemName) {
    const upper = csvItemName.toUpperCase().trim();
    if (TARGET_MODELS.includes(upper)) return upper;

    if (upper.includes('NET')) return 'NET';
    if (upper.includes('BAG')) return 'BAG';
    if (upper.includes('ROPE')) return 'ROPES';
    if (upper.includes('GLOVE')) return 'GLOVES';
    if (upper.includes('CHEST GUARD')) return 'CHEST GUARD';
    if (upper.includes('BODY COVER')) return 'BODY COVER';
    if (upper.includes('BACK REST')) return 'BACK REST PAD';
    if (upper.includes('DOCUMENT')) return 'DOCUMENT FOLDER';
    if (upper.includes('LED')) return 'LED';
    if (upper.includes('CLOTH')) return 'MICROFIBER CLOTH';
    if (upper.includes('HOLDER')) return 'MOBILE HOLDER';
    if (upper.includes('SPIKE')) return 'QUILTED SPIKE';
    if (upper.includes('MAT')) return 'QUILTING MAT';
    if (upper.includes('TANK COVER')) return 'TANK COVER';

    return upper;
}

async function main() {
    // 1. Count from CSV
    const filePath = path.join(__dirname, '..', 'autoform (2).csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    const csvCounts = {};
    TARGET_MODELS.forEach(m => csvCounts[m] = new Set());

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const oemName = values[0];
        const designName = values[3]; // ITEMS column (Design)
        const modelRaw = values[1]; // PART NO column (Model)

        if (oemName && oemName.replace(/['"]+/g, '').trim() === 'OTHER') {
            const mappedModel = mapToTargetModel(modelRaw.replace(/['"]+/g, '').trim());
            const cleanDesign = designName.replace(/['"]+/g, '').trim();

            if (csvCounts[mappedModel]) {
                csvCounts[mappedModel].add(cleanDesign);
            } else {
                // console.log(`Unmapped CSV Model: ${modelRaw} -> ${mappedModel}`);
            }
        }
    }

    // 2. Count from DB
    const otherOem = await prisma.oEM.findFirst({ where: { name: 'OTHER' } });
    const dbCounts = {};

    if (otherOem) {
        const models = await prisma.model.findMany({
            where: { oemId: otherOem.id },
            include: { designs: true }
        });

        models.forEach(m => {
            dbCounts[m.name] = m.designs.length;
        });
    }

    // 3. Compare
    console.log('Comparison (Model: CSV Unique Designs vs DB Designs)');
    let totalCsv = 0;
    let totalDb = 0;

    TARGET_MODELS.forEach(m => {
        const csvCount = csvCounts[m] ? csvCounts[m].size : 0;
        const dbCount = dbCounts[m] || 0;
        totalCsv += csvCount;
        totalDb += dbCount;

        const status = csvCount === dbCount ? 'OK' : 'MISMATCH';
        console.log(`${m.padEnd(20)}: CSV=${csvCount}, DB=${dbCount} [${status}]`);
    });

    console.log('------------------------------------------------');
    console.log(`TOTAL               : CSV=${totalCsv}, DB=${totalDb}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
