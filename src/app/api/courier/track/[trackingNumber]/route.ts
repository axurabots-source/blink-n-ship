import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ trackingNumber: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { trackingNumber } = await params;

        const shipment = await prisma.shipment.findFirst({
            where: { userId: user.id, trackingNumber },
        });

        if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });

        const [timeline, snapshots] = await Promise.all([
            prisma.shipmentTimeline.findMany({
                where: { shipmentId: shipment.id },
                orderBy: { occurredAt: 'asc' },
            }),
            prisma.trackingSnapshot.findMany({
                where: { shipmentId: shipment.id },
                orderBy: { fetchedAt: 'desc' },
                take: 5,
            }),
        ]);

        return NextResponse.json({ shipment, timeline, snapshots });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
