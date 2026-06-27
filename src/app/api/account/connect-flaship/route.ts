import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
        return NextResponse.json(
            { error: 'email and password are required' },
            { status: 400 }
        );
    }

    const encryptedCredentials = encrypt(JSON.stringify({ email, password }));

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