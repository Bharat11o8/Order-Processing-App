import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const oems = await prisma.oEM.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(oems);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
