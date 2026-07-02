import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const settings = await prisma.courierSettings.findUnique({
            where: { userId: user.id },
        });

        return NextResponse.json({ settings });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await request.json();
        const { defaultProvider, defaultCompanyId, defaultPickupId, defaultServiceType, autoSyncEnabled, autoSyncIntervalMins, bookingRetryCount, timeoutSeconds } = body;

        const settings = await prisma.courierSettings.upsert({
            where: { userId: user.id },
            update: {
                defaultProvider,
                defaultCompanyId,
                defaultPickupId,
                defaultServiceType,
                autoSyncEnabled,
                autoSyncIntervalMins,
                bookingRetryCount,
                timeoutSeconds,
            },
            create: {
                userId: user.id,
                defaultProvider: defaultProvider || 'flaship',
                defaultCompanyId,
                defaultPickupId,
                defaultServiceType,
                autoSyncEnabled: autoSyncEnabled ?? false,
                autoSyncIntervalMins: autoSyncIntervalMins ?? 30,
                bookingRetryCount: bookingRetryCount ?? 3,
                timeoutSeconds: timeoutSeconds ?? 30,
            },
        });

        return NextResponse.json({ settings });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
