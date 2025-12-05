import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const { oemId } = Object.fromEntries(searchParams);

    if (!oemId) {
        return NextResponse.json({ error: 'OEM ID required' }, { status: 400 });
    }

    try {
        const models = await prisma.model.findMany({
            where: { oemId },
            orderBy: { name: 'asc' },
            include: { vehicleType: true } // Include type for auto-fill
        });
        return NextResponse.json(models);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
