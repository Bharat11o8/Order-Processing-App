const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 0. Cleanup (Optional: use with caution in prod)
    // Delete in order of dependency
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    // await prisma.designColor.deleteMany();
    // await prisma.design.deleteMany();
    // await prisma.vehicleType.deleteMany();
    // await prisma.vehicle.deleteMany(); // Removed table
    await prisma.subDealer.deleteMany();
    // We keep Users, Zones, Dealers, OEMs mostly, but to be safe for catalog re-run:
    // Actually, let's just rely on upsert for top levels and delete catalog to re-create.
    console.log('Cleanup done.');

    // 1. Create Zones
    const zonesData = [
        'South Zone', 'West Bengal', 'Bihar & Jharkhand', 'MP & Maharashtra',
        'North Zone', 'Assam', 'Odisha', 'Rajasthan & Gujarat'
    ];

    const zones = {};
    for (const name of zonesData) {
        const zone = await prisma.zone.upsert({
            where: { name },
            update: {},
            create: { name },
        });
        zones[name] = zone;
        console.log(`Created Zone: ${name}`);
    }

    // 2. Create Users (Admin + ASMs)
    const passwordASM = await bcrypt.hash('asm123', 10);
    const passwordAdmin = await bcrypt.hash('admin123', 10);

    // Admin
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            name: 'System Admin',
            username: 'admin',
            passwordHash: passwordAdmin,
            role: 'ADMIN',
        },
    });

    // ASMs
    const asms = [
        { name: 'Ajith', username: 'asm_ajith', zone: 'South Zone' },
        { name: 'Biswajit', username: 'asm_biswajit', zone: 'West Bengal' },
        { name: 'Kundan', username: 'asm_kundan', zone: 'Bihar & Jharkhand' },
        { name: 'Prafulla', username: 'asm_prafulla', zone: 'MP & Maharashtra' },
        { name: 'Rahul', username: 'asm_rahul', zone: 'North Zone' },
        { name: 'Rishu', username: 'asm_rishu', zone: 'Assam' },
        { name: 'Sisir', username: 'asm_sisir', zone: 'Odisha' },
        { name: 'Vinay', username: 'asm_vinay', zone: 'Rajasthan & Gujarat' },
    ];

    for (const asm of asms) {
        await prisma.user.upsert({
            where: { username: asm.username },
            update: { zoneId: zones[asm.zone].id },
            create: {
                name: asm.name,
                username: asm.username,
                passwordHash: passwordASM,
                role: 'ASM',
                zoneId: zones[asm.zone].id,
            },
        });
        console.log(`Created ASM: ${asm.username}`);
    }

    // 3. Create Dealers (2 per zone)
    for (const zoneName of zonesData) {
        const zone = zones[zoneName];
        for (let i = 1; i <= 2; i++) {
            const dealerCode = `DLR-${zoneName.substring(0, 3).toUpperCase()}-${i}`;
            const dealer = await prisma.dealer.upsert({
                where: { code: dealerCode },
                update: {},
                create: {
                    name: `${zoneName} Dealer ${i}`,
                    code: dealerCode,
                    location: `${zoneName} City ${i}`,
                    mobile: '9876543210',
                    zoneId: zone.id,
                },
            });

            // Create Sub-Dealers
            if (i === 1) { // Only for the first dealer in each zone to show variety
                await prisma.subDealer.createMany({
                    data: [
                        { name: `${dealer.name} - Sub 1`, dealerId: dealer.id },
                        { name: `${dealer.name} - Sub 2`, dealerId: dealer.id },
                    ]
                });
            }
        }
    }
    console.log('Dealers created.');

    // 4. Create Catalog (OEMs -> Vehicles -> Types -> Designs -> Colors)
    // Skipped to preserve imported data
    /*
    const oems = ['Tata', 'Mahindra', 'Ashok Leyland'];

    for (const oemName of oems) {
        const oem = await prisma.oEM.upsert({
            where: { name: oemName },
            update: {},
            create: { name: oemName },
        });

        // Sample Vehicle
        const vehicleName = `${oemName} Truck`;
        const vehicle = await prisma.vehicle.create({
            data: {
                name: vehicleName,
                oemId: oem.id,
                vehicleTypes: {
                    create: [
                        {
                            name: `${vehicleName} Gold`,
                            designs: {
                                create: [
                                    {
                                        productCode: `PNC-${oemName.substring(0, 2)}-001`,
                                        unitType: 'PCS',
                                        seatOption: 'BOTH',
                                        colors: {
                                            create: [{ name: 'Red' }, { name: 'Blue' }]
                                        }
                                    },
                                    {
                                        productCode: `PNC-${oemName.substring(0, 2)}-002`,
                                        unitType: 'SET',
                                        seatOption: 'SINGLE',
                                        colors: {
                                            create: [{ name: 'Generic' }]
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        });
    }
    */

    console.log('Catalog created.');
    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
