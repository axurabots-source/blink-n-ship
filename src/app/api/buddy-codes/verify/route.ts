import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { code } = await req.json();

        if (!code || typeof code !== 'string' || !code.trim()) {
            return NextResponse.json(
                { valid: false, message: 'Buddy code is required' },
                { status: 400 }
            );
        }

        const buddyCode = await prisma.buddyCode.findUnique({
            where: { code: code.trim() },
        });

        if (!buddyCode || !buddyCode.isActive) {
            return NextResponse.json(
                { valid: false, message: 'Invalid buddy code. Please check and try again.' }
            );
        }

        return NextResponse.json({ valid: true });
    } catch {
        return NextResponse.json(
            { valid: false, message: 'Server error. Please try again.' },
            { status: 500 }
        );
    }
}
