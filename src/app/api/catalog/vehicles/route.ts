import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const oemId = searchParams.get('oemId');

    if (!oemId) {
        return NextResponse.json({ error: 'oemId is required' }, { status: 400 });
    }

    try {
        const vehicles = await prisma.vehicle.findMany({
            where: { oemId },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(vehicles);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
