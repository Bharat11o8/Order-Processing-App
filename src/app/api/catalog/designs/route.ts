import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const { modelId } = Object.fromEntries(searchParams);

    if (!modelId) {
        return NextResponse.json({ error: 'Model ID required' }, { status: 400 });
    }

    try {
        const designs = await prisma.design.findMany({
            where: { modelId },
            include: {
                colors: true,
                variants: true,
            },
            orderBy: { productCode: 'asc' },
        });
        return NextResponse.json(designs);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
