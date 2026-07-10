import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // Last sync per type
        const syncTypes = ['companies', 'pickup_locations', 'cities', 'rate_cards', 'tracking', 'full'];
        const lastSyncs: Record<string, any> = {};

        for (const type of syncTypes) {
            const last = await prisma.syncLog.findFirst({
                where: { userId: user.id, syncType: type },
                orderBy: { startedAt: 'desc' },
            });
            lastSyncs[type] = last;
        }

        const recentLogs = await prisma.syncLog.findMany({
            where: { userId: user.id },
            orderBy: { startedAt: 'desc' },
            take: 10,
        });

        return NextResponse.json({ lastSyncs, recentLogs });
    } catch (err: any) {
        return apiError(err);
    }
}
