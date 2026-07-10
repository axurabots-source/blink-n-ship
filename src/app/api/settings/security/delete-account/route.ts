import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const userId = user.id;

        await prisma.$transaction(async (tx) => {
            const teamMemberIds = await tx.teamMember.findMany({
                where: { ownerId: userId },
                select: { id: true },
            });
            if (teamMemberIds.length > 0) {
                await tx.teamMemberPermission.deleteMany({
                    where: { memberId: { in: teamMemberIds.map(m => m.id) } },
                });
                await tx.teamMember.deleteMany({ where: { ownerId: userId } });
            }

            await tx.userSession.deleteMany({ where: { userId } });
            await tx.activityLog.deleteMany({ where: { userId } });
            await tx.courierActivityLog.deleteMany({ where: { userId } });
            await tx.apiLog.deleteMany({ where: { userId } });
            await tx.syncLog.deleteMany({ where: { userId } });
            await tx.courierSettings.deleteMany({ where: { userId } });
            await tx.profile.deleteMany({ where: { id: userId } });
        });

        // Sign the user out — their data is gone
        await supabase.auth.signOut();

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return apiError(err);
    }
}
