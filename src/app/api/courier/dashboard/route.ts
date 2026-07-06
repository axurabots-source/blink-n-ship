import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const [
            totalBooked,
            pending,
            inTransit,
            delivered,
            returned,
            cancelled,
            failed,
            recentShipments,
            recentErrors,
            lastSync,
        ] = await Promise.all([
            prisma.shipment.count({ where: { userId: user.id } }),
            prisma.shipment.count({ where: { userId: user.id, status: 'booked' } }),
            prisma.shipment.count({ where: { userId: user.id, status: 'in_transit' } }),
            prisma.shipment.count({ where: { userId: user.id, status: 'delivered' } }),
            prisma.shipment.count({ where: { userId: user.id, status: 'returned' } }),
            prisma.shipment.count({ where: { userId: user.id, status: 'cancelled' } }),
            prisma.shipment.count({ where: { userId: user.id, status: 'failed' } }),
            prisma.shipment.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            prisma.apiLog.findMany({
                where: { userId: user.id, isSuccess: false },
                orderBy: { calledAt: 'desc' },
                take: 5,
            }),
            prisma.syncLog.findFirst({
                where: { userId: user.id },
                orderBy: { startedAt: 'desc' },
            }),
        ]);


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
