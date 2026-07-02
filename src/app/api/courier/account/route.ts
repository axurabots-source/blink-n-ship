import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const [account, meta, settings, profile] = await Promise.all([
            prisma.courierAccount.findFirst({
                where: { userId: user.id, provider: 'flaship', isActive: true },
                select: { id: true, provider: true, authMethod: true, connectedAt: true, lastVerifiedAt: true },
            }),
            prisma.courierAccountMetadata.findFirst({
                where: { userId: user.id, provider: 'flaship' },
            }),
            prisma.courierSettings.findUnique({ where: { userId: user.id } }),
            prisma.profile.findUnique({ where: { id: user.id } }),
        ]);

        if (meta) {
            meta.accountName = profile?.businessName || meta.accountName || 'Connected Account';
            if (meta.balance === null || meta.balance === undefined) {
                // If there's no balance in DB, default to 0
                meta.balance = new (require('@prisma/client').Prisma.Decimal)(0);
            }
        }

        return NextResponse.json({ account, meta, settings });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { balance, accountName } = await request.json();

        const updateData: any = {};
        if (balance !== undefined) updateData.balance = Number(balance);
        if (accountName !== undefined) updateData.accountName = accountName;

        const updated = await prisma.courierAccountMetadata.updateMany({
            where: { userId: user.id, provider: 'flaship' },
            data: updateData,
        });

        return NextResponse.json({ success: true, updatedCount: updated.count });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // Deactivate connection, but preserve rate cards and other details in the database
        await prisma.courierAccount.updateMany({
            where: { userId: user.id, provider: 'flaship' },
            data: { isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

