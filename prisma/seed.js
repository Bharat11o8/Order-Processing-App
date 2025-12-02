const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
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
        { name: 'Ajith', username: 'asm_ajith' },
        { name: 'Biswajit', username: 'asm_biswajit' },
        { name: 'Kundan', username: 'asm_kundan' },
        { name: 'Prafulla', username: 'asm_prafulla' },
        { name: 'Rahul', username: 'asm_rahul' },
        { name: 'Rishu', username: 'asm_rishu' },
        { name: 'Sisir', username: 'asm_sisir' },
        { name: 'Vinay', username: 'asm_vinay' },
    ];

    for (const asm of asms) {
        await prisma.user.upsert({
            where: { username: asm.username },
            update: {},
            create: {
                name: asm.name,
                username: asm.username,
                passwordHash: passwordASM,
                role: 'ASM',
            },
        });
    }

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
