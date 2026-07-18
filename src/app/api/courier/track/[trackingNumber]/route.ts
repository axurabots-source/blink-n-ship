import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

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
            include: {
                company: { select: { name: true } },
            },
        });

        if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });

        const courierProvider = shipment.company?.name || (shipment.bookingRequest as any)?.courierCompany || null;

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

        return NextResponse.json({ shipment: { ...shipment, courierProvider }, timeline, snapshots });
    } catch (err: any) {
        return apiError(err);
    }
}
