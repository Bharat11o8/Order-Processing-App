import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const vehicleTypeId = searchParams.get('vehicleTypeId');

    if (!vehicleTypeId) {
        return NextResponse.json({ error: 'vehicleTypeId is required' }, { status: 400 });
    }

    try {
        const designs = await prisma.design.findMany({
            where: { vehicleTypeId },
            include: {
                colors: true,
            },
            orderBy: { productCode: 'asc' },
        });
        return NextResponse.json(designs);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
