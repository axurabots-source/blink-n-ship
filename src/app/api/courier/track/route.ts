import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getTrackingStatus } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';
import { apiError } from '@/lib/api-error';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { trackingNumber } = await request.json();
        if (!trackingNumber) return NextResponse.json({ error: 'trackingNumber is required' }, { status: 400 });

        // Find the shipment
        const shipment = await prisma.shipment.findFirst({
            where: { userId: user.id, trackingNumber },
        });

        // Fetch live tracking from Flaship
        const trackingData = await getTrackingStatus(user.id, trackingNumber);

        // Save raw snapshot (append-only — never overwrite)
        if (shipment) {
            await prisma.trackingSnapshot.create({
                data: {
                    shipmentId: shipment.id,
                    trackingNumber,
                    rawResponse: trackingData.raw ?? trackingData,
                    fetchedAt: new Date(),
                },
            });

            // Add new timeline events that don't already exist
            const existing = await prisma.shipmentTimeline.findMany({
                where: { shipmentId: shipment.id },
                select: { status: true, occurredAt: true },
            });
            const existingKeys = new Set(existing.map(e => `${e.status}|${e.occurredAt.toISOString()}`));

            const newEvents = (trackingData.tracking || []).filter((h: any) => {
                // trackingData.tracking entries now have h.time as a normalized Date (from flaship.ts getTrackingStatus)
                const timeKey = h.time instanceof Date ? h.time.toISOString() : String(h.time || '');
                const key = `${h.status}|${timeKey}`;
                return !existingKeys.has(key);
            });

            if (newEvents.length > 0) {
                await prisma.shipmentTimeline.createMany({
                    data: newEvents.map((h: any) => ({
                        shipmentId: shipment.id,
                        status: h.status,
                        description: h.description || h.status,
                        location: h.location,
                        occurredAt: h.time instanceof Date ? h.time : new Date(h.time || Date.now()),
                        source: 'courier',
                        rawData: h,
                    })),
                });
            }

            // Update shipment status
            const newStatus = trackingData.orderStatus || 'in_transit';
            await prisma.shipment.update({
                where: { id: shipment.id },
                data: {
                    status: newStatus,
                    courierStatus: newStatus,
                    lastTrackedAt: new Date(),
                    ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
                    ...(newStatus === 'returned' ? { returnedAt: new Date() } : {}),
                },
            });

            // Handle returns — restore stock and update order
            if (newStatus === 'returned' && shipment.orderId) {
                const order = await prisma.order.findUnique({ where: { id: shipment.orderId } });
                if (order && order.status === 'booked') {
                    if (order.productId) {
                        await prisma.product.update({
                            where: { id: order.productId },
                            data: { stockQuantity: { increment: order.quantity || 1 } },
                        });
                    }
                    await prisma.order.update({
                        where: { id: shipment.orderId },
                        data: { status: 'returned', courierStatus: 'returned', returnedAt: new Date() },
                    });
                    await logActivity(user.id, 'returned', `Order returned: ${trackingNumber}`, shipment.id, 'shipment');
                }
            }
        }

        return NextResponse.json({ tracking: trackingData, shipmentId: shipment?.id });
    } catch (err: any) {
        return apiError(err);
    }
}
