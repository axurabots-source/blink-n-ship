import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { bulkBookShipments } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';
import { validatePhone } from '@/lib/validation';
import { apiError } from '@/lib/api-error';
import { rateLimit, Limit } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const rl = rateLimit('bulk-book', user.id, Limit.booking);
        if (!rl.success) {
            return NextResponse.json({ error: 'Too many booking requests. Please wait before trying again.' }, { status: 429 });
        }

        const { orderIds, courierCompany } = await request.json();
        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: 'orderIds array is required' }, { status: 400 });
        }

        const orders = await prisma.order.findMany({
            where: { id: { in: orderIds }, userId: user.id, status: 'draft' },
            include: { product: true },
        });

        if (orders.length === 0) {
            return NextResponse.json({ error: 'No eligible draft orders found' }, { status: 400 });
        }

        const pickupLocation = await prisma.pickupLocation.findFirst({
            where: { userId: user.id, isDefault: true },
        });

        const orderPayloads = orders.map(order => ({
            orderId: order.id,
            customerName: order.customerName || '',
            phoneNumber: validatePhone(order.phoneNumber),
            address: order.address || '',
            city: order.city || '',
            weight: Number(order.weight || order.product?.weight || 0.5),
            shippingType: order.shippingType || 'overnight',
            codAmount: Number(order.sellingPrice || 0),
            pieces: order.quantity || 1,
            courierCompany: courierCompany || 'flaship_direct',
            pickupLocationId: pickupLocation?.id,
        }));

        const results = await bulkBookShipments(user.id, orderPayloads);

        let successCount = 0;
        let failCount = 0;

        for (const res of results) {
            const order = orders.find(o => o.id === res.orderId);
            if (!order) continue;

            if (res.success && res.data) {
                const shipment = await prisma.$transaction(async (tx) => {
                    const shipment = await tx.shipment.create({
                        data: {
                            userId: user.id,
                            orderId: order.id,
                            provider: 'flaship',
                            pickupLocationId: pickupLocation?.id,
                            trackingNumber: res.data.trackingId,
                            cn: res.data.cn,
                            externalId: res.data.orderNo,
                            labelUrl: res.data.labelUrl,
                            status: 'booked',
                            courierStatus: res.data.courier_status,
                            weight: Number(order.weight || 0.5),
                            codAmount: Number(order.sellingPrice || 0),
                            recipientName: order.customerName,
                            recipientPhone: validatePhone(order.phoneNumber),
                            recipientAddress: order.address,
                            recipientCity: order.city,
                            bookedAt: new Date(),
                            bookingResponse: res.data.raw,
                        },
                    });

                    await tx.shipmentTimeline.create({
                        data: {
                            shipmentId: shipment.id,
                            status: 'booked',
                            description: 'Bulk booked via Flaship',
                            source: 'system',
                            occurredAt: new Date(),
                        },
                    });

                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            status: 'booked',
                            trackingNumber: res.data.trackingId,
                            labelUrl: res.data.labelUrl,
                            courierProvider: courierCompany || 'flaship_direct',
                            courierStatus: res.data.courier_status,
                            shipmentId: shipment.id,
                            bookedAt: new Date(),
                        },
                    });

                    return shipment;
                });

                successCount++;
            } else {
                failCount++;
            }
        }

        await logActivity(user.id, 'booked', `Bulk booked: ${successCount} success, ${failCount} failed`, null, 'sync', { successCount, failCount });

        return NextResponse.json({ success: true, successCount, failCount, results });
    } catch (err: any) {
        return apiError(err);
    }
}
