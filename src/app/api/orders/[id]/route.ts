import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
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
                                            include: { oem: true }
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

export async function PATCH(
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

        // 2. Validate Body
        const body = await request.json();
        // Reuse create schema for now, but might need a partial one. 
        // For full update of draft, create schema is fine.
        const { createOrderSchema } = await import('@/lib/validators/order');
        const validation = createOrderSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.format() }, { status: 400 });
        }

        const { dealerId, subDealerId, dealerMobile, paymentType, creditDays, remarks, items } = validation.data;

        // 3. Transaction
        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Fetch existing order to check status and ownership
            const existingOrder = await tx.order.findUnique({ where: { id } });
            if (!existingOrder) throw new Error('Order not found');
            if (existingOrder.userId !== userId) throw new Error('Forbidden');
            if (existingOrder.status !== 'DRAFT') throw new Error('Only DRAFT orders can be edited');

            // Fetch Dealer for location snapshot (if changed)
            const dealer = await tx.dealer.findUnique({ where: { id: dealerId } });
            if (!dealer) throw new Error('Dealer not found');

            // Calculate total quantity
            const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

            // Update Order
            // We delete existing items and recreate them to handle changes easily
            await tx.orderItem.deleteMany({ where: { orderId: id } });

            const order = await tx.order.update({
                where: { id },
                data: {
                    dealerId,
                    subDealerId,
                    dealerLocation: dealer.location,
                    dealerMobile,
                    paymentType,
                    creditDays: paymentType === 'CREDIT' ? creditDays : null,
                    remarks,
                    totalQuantity,
                    items: {
                        create: await Promise.all(items.map(async (item) => {
                            const design = await tx.design.findUnique({ where: { id: item.designId } });
                            if (!design) throw new Error(`Design not found: ${item.designId}`);

                            if (design.unitType !== item.unitType) throw new Error(`Unit type mismatch for design ${design.productCode}`);

                            if (design.seatOption === 'SINGLE' && item.seatType !== 'SINGLE') throw new Error(`Invalid seat type for ${design.productCode}`);
                            if (design.seatOption === 'DOUBLE' && item.seatType !== 'DOUBLE') throw new Error(`Invalid seat type for ${design.productCode}`);
                            if (design.seatOption === 'BOTH' && !item.seatType) throw new Error(`Seat type required for ${design.productCode}`);

                            return {
                                designId: item.designId,
                                colorId: item.colorId,
                                quantity: item.quantity,
                                unitType: design.unitType,
                                seatType: item.seatType,
                                productCode: design.productCode,
                            };
                        })),
                    },
                },
                include: { items: true },
            });

            return order;
        });

        return NextResponse.json(updatedOrder);

    } catch (error: any) {
        console.error('Update order error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message === 'Forbidden' ? 403 : 500 });
    }
}
