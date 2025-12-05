const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_MODELS = [
    'BODY COVER', 'NET', 'BAG', 'BACK REST PAD', 'ROPES', 'GLOVES',
    'CHEST GUARD', 'DOCUMENT FOLDER', 'LED', 'MICROFIBER CLOTH',
    'MOBILE HOLDER', 'QUILTED SPIKE', 'QUILTING MAT', 'TANK BAG', 'TANK COVER'
];

async function main() {
    console.log('Starting fix for OTHERS models...');

    const othersOEM = await prisma.oEM.findFirst({
        where: { name: 'OTHER' }
    });

    if (!othersOEM) {
        console.error('OTHER OEM not found!');
        return;
    }

    // 1. Ensure Target Models exist
    const targetModelMap = new Map(); // Name -> ID
    for (const name of TARGET_MODELS) {
        // Find or create
        let model = await prisma.model.findFirst({
            where: { name: name, oemId: othersOEM.id }
        });

        if (!model) {
            // We need a vehicleType. Let's find "ACCESSORIES" type.
            const type = await prisma.vehicleType.findFirst({ where: { name: 'ACCESSORIES' } });
            if (!type) {
                console.error('ACCESSORIES type not found!');
                return;
            }

            model = await prisma.model.create({
                data: {
                    name: name,
                    oemId: othersOEM.id,
                    vehicleTypeId: type.id
                }
            });
            console.log(`Created target model: ${name}`);
        }
        targetModelMap.set(name, model.id);
    }

    // 2. Find all models for OTHERS
    const allModels = await prisma.model.findMany({
        where: { oemId: othersOEM.id },
        include: { designs: true }
    });

    // 3. Migrate Designs
    for (const model of allModels) {
        // Skip if it's already a target model
        if (TARGET_MODELS.includes(model.name)) continue;

        let targetName = null;

        // Heuristic Matching
        const upperName = model.name.toUpperCase();

        if (upperName.includes('NET')) targetName = 'NET';
        else if (upperName.includes('CARRY BAG')) targetName = 'BAG'; // Specific check before generic BAG
        else if (upperName.includes('TANK BAG')) targetName = 'TANK BAG';
        else if (upperName.includes('BAG')) targetName = 'BAG';
        else if (upperName.includes('ROPE')) targetName = 'ROPES';
        else if (upperName.includes('GLOVE')) targetName = 'GLOVES';
        else if (upperName.includes('CHEST GUARD')) targetName = 'CHEST GUARD';
        else if (upperName.includes('BODY COVER')) targetName = 'BODY COVER';
        else if (upperName.includes('BACK REST')) targetName = 'BACK REST PAD';
        else if (upperName.includes('DOCUMENT')) targetName = 'DOCUMENT FOLDER';
        else if (upperName.includes('LED')) targetName = 'LED';
        else if (upperName.includes('CLOTH')) targetName = 'MICROFIBER CLOTH';
        else if (upperName.includes('HOLDER')) targetName = 'MOBILE HOLDER';
        else if (upperName.includes('SPIKE')) targetName = 'QUILTED SPIKE';
        else if (upperName.includes('MAT')) targetName = 'QUILTING MAT';
        else if (upperName.includes('TANK COVER')) targetName = 'TANK COVER';

        if (targetName) {
            const targetId = targetModelMap.get(targetName);
            console.log(`Migrating ${model.name} -> ${targetName}`);

            // Update Designs
            await prisma.design.updateMany({
                where: { modelId: model.id },
                data: { modelId: targetId }
            });

            // Delete old model
            await prisma.model.delete({ where: { id: model.id } });
        } else {
            console.warn(`Could not match model: ${model.name}`);
        }
    }

    console.log('Fix complete!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
