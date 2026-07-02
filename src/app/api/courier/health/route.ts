import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { verifyAndFetchAccount } from '@/lib/flaship';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const start = Date.now();
        let pingTime = 0;
        let isHealthy = false;
        let error = null;

        try {
            await verifyAndFetchAccount(user.id);
            pingTime = Date.now() - start;
            isHealthy = true;
        } catch (e: any) {
            pingTime = Date.now() - start;
            error = e.message;
        }

        const recentErrors = await prisma.apiLog.findMany({
            where: { userId: user.id, isSuccess: false },
            orderBy: { calledAt: 'desc' },
            take: 10,
        });

        return NextResponse.json({
            isHealthy,
            pingTimeMs: pingTime,
            error,
            recentErrors,
            provider: 'flaship',
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
