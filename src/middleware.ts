import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('session_token')?.value;
    const { pathname } = request.nextUrl;

    // Define protected routes
    const isASMRoute = pathname.startsWith('/asm');
    const isAdminRoute = pathname.startsWith('/admin');

    if (isASMRoute || isAdminRoute) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        try {
            const secret = new TextEncoder().encode(JWT_SECRET);
            const { payload } = await jwtVerify(token, secret);
            const role = payload.role as string;

            if (isASMRoute && role !== 'ASM') {
                return NextResponse.redirect(new URL('/login', request.url)); // Or unauthorized page
            }

            if (isAdminRoute && role !== 'ADMIN') {
                return NextResponse.redirect(new URL('/login', request.url));
            }

        } catch (error) {
            // Invalid token
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/asm/:path*', '/admin/:path*'],
};
