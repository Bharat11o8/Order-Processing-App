import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');

    if (!vehicleId) {
        return NextResponse.json({ error: 'vehicleId is required' }, { status: 400 });
    }

    try {
        const types = await prisma.vehicleType.findMany({
            where: { vehicleId },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(types);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
