import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

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
        return apiError(err);
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { accountName } = await request.json();

        const updateData: any = {};
        if (accountName !== undefined) updateData.accountName = accountName;

        const updated = await prisma.courierAccountMetadata.updateMany({
            where: { userId: user.id, provider: 'flaship' },
            data: updateData,
        });

        return NextResponse.json({ success: true, updatedCount: updated.count });
    } catch (err: any) {
        return apiError(err);
    }
}

// DELETE — permanently removed.
// The courier account binding is permanent and cannot be disconnected from the UI.
// Account deletion is handled through the account deletion endpoint only.

