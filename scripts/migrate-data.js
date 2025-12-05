const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration...');

    // 1. Update Color Codes
    const colorMappings = {
        'Red': 'RD',
        'Blue': 'BU',
        'White': 'CW',
        'Black': 'BK', // Assumption
        'Grey': 'GR', // Assumption
        'Silver': 'SL', // Assumption
    };

    for (const [name, code] of Object.entries(colorMappings)) {
        const result = await prisma.designColor.updateMany({
            where: { name: { equals: name, mode: 'insensitive' } },
            data: { code },
        });
        console.log(`Updated ${result.count} colors for ${name} -> ${code}`);
    }

    // 2. Update Design Names (based on examples)
    const designMappings = {
        'PNC-Ta-001': 'TATA ACE',
        'PNC-Ta-002': 'TATA ACE (SET)',
        'PNC-Ma-001': 'MARUTI 800',
        'PNC-Ma-002': 'MARUTI 800 (SET)',
        'PNC-As-001': 'ASHOK LEYLAND',
    };

    for (const [code, name] of Object.entries(designMappings)) {
        // Note: productCode is unique, so we can use update
        const result = await prisma.design.update({
            where: { productCode: code },
            data: { name },
        }).catch(err => console.log(`Design ${code} not found or update failed`));

        if (result) console.log(`Updated Design ${code} -> ${name}`);
    }

    // 3. Update Generic/Others
    // Maybe set code to null for Generic explicitly if needed, but it's already null.

    console.log('Migration complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
