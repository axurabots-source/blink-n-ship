import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const orders = await prisma.order.findMany({
            where: { userId: user.id, NOT: { status: 'draft' } },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const shipmentIds = orders.map(o => o.shipmentId).filter(Boolean) as string[];
        const shipments = shipmentIds.length > 0
            ? await prisma.shipment.findMany({
                where: { id: { in: shipmentIds } },
                include: {
                    timeline: { orderBy: { occurredAt: 'desc' }, take: 1 },
                },
            })
            : [];

        const shipmentMap = new Map(shipments.map(s => [s.id, s]));

        const enriched = orders.map(order => ({
            ...order,
            shipment: order.shipmentId ? shipmentMap.get(order.shipmentId) || null : null,
        }));

        return NextResponse.json({ orders: enriched });
    } catch (err: any) {
        return apiError(err);
    }
}
