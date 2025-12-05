import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId;

        // 2. Transaction
        const order = await prisma.$transaction(async (tx) => {
            const existingOrder = await tx.order.findUnique({ where: { id } });

            if (!existingOrder) throw new Error('Order not found');
            if (existingOrder.userId !== userId) throw new Error('Forbidden');
            if (existingOrder.status !== 'DRAFT') throw new Error('Only DRAFT orders can be submitted');

            // Update Status
            return await tx.order.update({
                where: { id },
                data: { status: 'SUBMITTED' }
            });
        });

        return NextResponse.json(order);

    } catch (error: any) {
        console.error('Submit order error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message === 'Forbidden' ? 403 : 500 });
    }
}
