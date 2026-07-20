import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { bookShipment, fetchPickupLocations } from '@/lib/flaship';
import { validatePickupLocations, normalizePickupLocationsList } from '@/lib/flaship-adapter';
import { logActivity } from '@/lib/courierHelpers';
import { validatePhone } from '@/lib/validation';
import { apiError } from '@/lib/api-error';
import { log } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { orderId, courierCompany, courierOption } = await request.json();
        if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });

        const [order] = await Promise.all([
            prisma.order.findFirst({
                where: { id: orderId, userId: user.id },
                include: { product: true },
            }),
        ]);

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        if (order.status === 'booked') return NextResponse.json({ error: 'Order is already booked' }, { status: 400 });

        // Find pickup location — prefer isDefault:true, fallback to first available.
        let pickupLocation = await prisma.pickupLocation.findFirst({
            where: { userId: user.id, provider: 'flaship' },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });

        // Auto-heal: if DB has no Flaship pickup locations (e.g. first sync skipped them
        // due to old strict validation), silently re-sync from Flaship before failing.
        if (!pickupLocation) {
            log.warn('BOOK', 'No Flaship pickup locations in DB — attempting auto-heal re-sync', { userId: user.id });
            try {
                const data = await fetchPickupLocations(user.id);
                const { valid } = validatePickupLocations(data.locations || []);
                if (valid.length > 0) {
                    await prisma.$transaction(async (tx) => {
                        await tx.pickupLocation.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
                        await tx.pickupLocation.createMany({
                            data: valid.map((l: any, i: number) => ({
                                userId: user.id,
                                provider: 'flaship',
                                externalId: l.id,
                                name: l.name,
                                contactPerson: l.contact_person,
                                phone: l.phone,
                                address: l.address,
                                city: l.city,
                                area: l.area,
                                isDefault: l.is_default ?? (i === 0),
                                rawData: l,
                            })),
                        });
                    });
                    // Re-fetch after heal
                    pickupLocation = await prisma.pickupLocation.findFirst({
                        where: { userId: user.id, provider: 'flaship' },
                        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
                    });
                    log.info('BOOK', `Auto-heal synced ${valid.length} pickup locations`, { userId: user.id });
                }
            } catch (healErr: any) {
                log.error('BOOK', 'Auto-heal re-sync failed', { error: healErr.message });
            }
        }

        if (!pickupLocation) return NextResponse.json({
            error: 'No pickup location found. Please go to Courier Settings → Pickup Locations and sync from Flaship.',
        }, { status: 400 });


        // Call real Flaship API
        const result = await bookShipment(user.id, {
            orderId,
            customerName: order.customerName || '',
            phoneNumber: validatePhone(order.phoneNumber),
            address: order.address || '',
            city: order.city || '',
            weight: Number(order.weight || order.product?.weight || 0.5),
            shippingType: courierOption || order.shippingType || 'overnight',
            codAmount: Number(order.sellingPrice || 0),
            pieces: order.quantity || 1,
            courierCompany: courierCompany || 'flaship_direct',
            pickupLocationId: pickupLocation?.id,
            pickupExternalId: pickupLocation?.externalId ?? undefined,
        });

        const shipment = await prisma.$transaction(async (tx) => {
            const shipment = await tx.shipment.create({
                data: {
                    userId: user.id,
                    orderId,
                    provider: 'flaship',
                    pickupLocationId: pickupLocation?.id,
                    trackingNumber: result.trackingId,
                    cn: result.cn,
                    externalId: result.orderNo,
                    labelUrl: result.labelUrl,
                    status: 'booked',
                    courierStatus: result.courier_status,
                    serviceType: courierOption || order.shippingType || 'overnight',
                    weight: Number(order.weight || order.product?.weight || 0.5),
                    pieces: order.quantity || 1,
                    codAmount: Number(order.sellingPrice || 0),
                    recipientName: order.customerName,
                    recipientPhone: validatePhone(order.phoneNumber),
                    recipientAddress: order.address,
                    recipientCity: order.city,
                    bookedAt: new Date(),
                    bookingResponse: result.raw,
                },
            });

            await tx.shipmentTimeline.create({
                data: {
                    shipmentId: shipment.id,
                    status: 'booked',
                    description: 'Consignment booked successfully via Flaship',
                    source: 'system',
                    occurredAt: new Date(),
                },
            });

            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'booked',
                    trackingNumber: result.trackingId,
                    labelUrl: result.labelUrl,
                    courierProvider: courierCompany || 'flaship_direct',
                    courierStatus: result.courier_status,
                    shipmentId: shipment.id,
                    bookedAt: new Date(),
                },
            });

            return shipment;
        });

        await logActivity(user.id, 'booked', `Order booked: tracking ${result.trackingId}`, shipment.id, 'shipment', { trackingNumber: result.trackingId });

        return NextResponse.json({ success: true, trackingNumber: result.trackingId, shipmentId: shipment.id, labelUrl: result.labelUrl });
    } catch (err: any) {
        return apiError(err);
    }
}
