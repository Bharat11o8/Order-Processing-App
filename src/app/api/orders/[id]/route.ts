import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function GET(
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

        // 2. Fetch Order
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                dealer: true,
                subDealer: true,
                items: {
                    include: {
                        design: {
                            include: {
                                vehicleType: {
                                    include: {
                                        vehicle: {
                                            include: { oEM: true }
                                        }
                                    }
                                }
                            }
                        },
                        color: true
                    }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 3. Ownership Check (ASM can only see their own orders)
        // Admin bypass could be added here later if needed
        if (order.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(order);

    } catch (error: any) {
        console.error('Fetch order detail error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
