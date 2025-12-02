import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { createOrderSchema } from '@/lib/validators/order';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(request: Request) {
    try {
        // 1. Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId;

        // 2. Validate Body
        const body = await request.json();
        const validation = createOrderSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.format() }, { status: 400 });
        }

        const { dealerId, subDealerId, dealerMobile, paymentType, creditDays, remarks, items } = validation.data;

        // 3. Transaction
        const order = await prisma.$transaction(async (tx) => {
            // Fetch Dealer for location snapshot
            const dealer = await tx.dealer.findUnique({ where: { id: dealerId } });
            if (!dealer) throw new Error('Dealer not found');

            // Calculate total quantity
            const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

            // Generate Order Number (Simple timestamp based for now, or random)
            const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Create Order
            const newOrder = await tx.order.create({
                data: {
                    orderNumber,
                    userId,
                    dealerId,
                    subDealerId,
                    dealerLocation: dealer.location,
                    dealerMobile, // User provided or could be dealer.mobile
                    paymentType,
                    creditDays: paymentType === 'CREDIT' ? creditDays : null,
                    remarks,
                    totalQuantity,
                    status: 'SUBMITTED', // Direct to submitted for now
                    items: {
                        create: await Promise.all(items.map(async (item) => {
                            // Fetch Design to verify/snapshot details
                            const design = await tx.design.findUnique({ where: { id: item.designId } });
                            if (!design) throw new Error(`Design not found: ${item.designId}`);

                            if (design.unitType !== item.unitType) {
                                throw new Error(`Unit type mismatch for design ${design.productCode}`);
                            }

                            // Validate Seat Type
                            if (design.seatOption === 'SINGLE' && item.seatType !== 'SINGLE') throw new Error(`Invalid seat type for ${design.productCode}. Must be SINGLE.`);
                            if (design.seatOption === 'DOUBLE' && item.seatType !== 'DOUBLE') throw new Error(`Invalid seat type for ${design.productCode}. Must be DOUBLE.`);
                            if (design.seatOption === 'BOTH' && !item.seatType) throw new Error(`Seat type required for ${design.productCode}`);

                            return {
                                designId: item.designId,
                                colorId: item.colorId,
                                quantity: item.quantity,
                                unitType: design.unitType, // Force from DB
                                seatType: item.seatType,
                                productCode: design.productCode, // Force from DB
                            };
                        })),
                    },
                },
                include: { items: true },
            });

            return newOrder;
        });

        return NextResponse.json(order, { status: 201 });

    } catch (error: any) {
        console.error('Order creation error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
