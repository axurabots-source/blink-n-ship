import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { apiError } from '@/lib/api-error';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { flashipConnected: true },
        });

        return NextResponse.json({ connected: profile?.flashipConnected || false });
    } catch (err) {
        return apiError(err);
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Check if already permanently connected
        const existing = await prisma.courierAccount.findFirst({
            where: { userId: user.id, provider: 'flaship', isActive: true },
            select: { id: true },
        });
        if (existing) {
            return NextResponse.json({
                error: 'A Flaship account is already permanently connected to this Blink N Ship account. This connection cannot be changed.',
            }, { status: 403 });
        }

        const { api_key } = await req.json();

        if (!api_key) {
            return NextResponse.json(
                { error: 'api_key required' },
                { status: 400 }
            );
        }

        const encryptedCredentials = encrypt(JSON.stringify({ api_key }));

        await prisma.$transaction(async (tx) => {
            await tx.courierAccount.deleteMany({
                where: {
                    userId: user.id,
                    provider: 'flaship',
                },
            });

            await tx.courierAccount.create({
                data: {
                    userId: user.id,
                    provider: 'flaship',
                    encryptedCredentials,
                },
            });

            await tx.profile.update({
                where: { id: user.id },
                data: { flashipConnected: true },
            });
        });

        return NextResponse.json({ connected: true });
    } catch (err) {
        return apiError(err);
    }
}