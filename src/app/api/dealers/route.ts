import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId;

        // Fetch user to get zoneId
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { zoneId: true, role: true },
        });

        if (!user || !user.zoneId) {
            return NextResponse.json({ error: 'User has no zone assigned' }, { status: 403 });
        }

        const dealers = await prisma.dealer.findMany({
            where: { zoneId: user.zoneId },
            include: {
                subDealers: true,
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(dealers);
    } catch (error) {
        console.error('Error fetching dealers:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
