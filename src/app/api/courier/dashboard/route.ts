import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const totalBooked = await prisma.shipment.count({ where: { userId: user.id } });
        const pending = await prisma.shipment.count({ where: { userId: user.id, status: 'booked' } });
        const inTransit = await prisma.shipment.count({ where: { userId: user.id, status: 'in_transit' } });
        const delivered = await prisma.shipment.count({ where: { userId: user.id, status: 'delivered' } });
        const returned = await prisma.shipment.count({ where: { userId: user.id, status: 'returned' } });
        const cancelled = await prisma.shipment.count({ where: { userId: user.id, status: 'cancelled' } });
        const failed = await prisma.shipment.count({ where: { userId: user.id, status: 'failed' } });

        const recentShipments = await prisma.shipment.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        const recentErrors = await prisma.apiLog.findMany({
            where: { userId: user.id, isSuccess: false },
            orderBy: { calledAt: 'desc' },
            take: 5,
        });

        const lastSync = await prisma.syncLog.findFirst({
            where: { userId: user.id },
            orderBy: { startedAt: 'desc' },
        });

        return NextResponse.json({
            stats: { totalBooked, pending, inTransit, delivered, returned, cancelled, failed },
            recentShipments,
            recentErrors,
            lastSync,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
