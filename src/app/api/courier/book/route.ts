import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { bookShipment } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { orderId, courierCompany, courierOption } = await request.json();
        if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });

        const order = await prisma.order.findFirst({
            where: { id: orderId, userId: user.id },
            include: { product: true },
        });

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        if (order.status === 'booked') return NextResponse.json({ error: 'Order is already booked' }, { status: 400 });

        const pickupLocation = await prisma.pickupLocation.findFirst({
            where: { userId: user.id, isDefault: true },
        });

        // Call real Flaship API
        const result = await bookShipment(user.id, {
            orderId,
            customerName: order.customerName || '',
            phoneNumber: order.phoneNumber || '',
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

        // Create Shipment record
        const shipment = await prisma.shipment.create({
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
                recipientPhone: order.phoneNumber,
                recipientAddress: order.address,
                recipientCity: order.city,
                bookedAt: new Date(),
                bookingResponse: result.raw,
            },
        });

        // Add booked event to shipment timeline
        await prisma.shipmentTimeline.create({
            data: {
                shipmentId: shipment.id,
                status: 'booked',
                description: 'Consignment booked successfully via Flaship',
                source: 'system',
                occurredAt: new Date(),
            },
        });

        // Decrement stock if product linked
        if (order.productId) {
            await prisma.product.update({
                where: { id: order.productId },
                data: { stockQuantity: { decrement: order.quantity || 1 } },
            });
        }

        // Update order status
        await prisma.order.update({
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

        await logActivity(user.id, 'booked', `Order booked: tracking ${result.trackingId}`, shipment.id, 'shipment', { trackingNumber: result.trackingId });

        return NextResponse.json({ success: true, trackingNumber: result.trackingId, shipmentId: shipment.id, labelUrl: result.labelUrl });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Booking failed' }, { status: 500 });
    }
}
