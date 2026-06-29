import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { api_key } = await req.json();

    if (!api_key) {
        return NextResponse.json(
            { error: 'api_key required' },
            { status: 400 }
        );
    }

    const encryptedCredentials = encrypt(JSON.stringify({ api_key }));

    // Delete any existing courier accounts for clean state (optional but safe)
    await prisma.courierAccount.deleteMany({
        where: {
            userId: user.id,
            provider: 'flaship',
        },
    });

    await prisma.courierAccount.create({
        data: {
            userId: user.id,
            provider: 'flaship',
            encryptedCredentials,
        },
    });

    await prisma.profile.update({
        where: { id: user.id },
        data: { flashipConnected: true },
    });

    return NextResponse.json({ connected: true });
}