import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { bookShipment } from '@/lib/flaship';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { order_ids } = await req.json();

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
        return NextResponse.json({ error: 'order_ids must be a non-empty array' }, { status: 400 });
    }

    const results = [];

    for (const id of order_ids) {
        const order = await prisma.order.findFirst({
            where: { id, userId: user.id },
        });

        if (!order) {
            results.push({ id, success: false, error: 'Order not found' });
            continue;
        }

        try {
            const booking = await bookShipment(user.id);

            if (order.productId) {
                await prisma.product.update({
                    where: { id: order.productId },
                    data: { stockQuantity: { decrement: order.quantity } },
                });
            }

            const updated = await prisma.order.update({
                where: { id },
                data: {
                    status: 'booked',
                    trackingNumber: booking.tracking_number,
                    labelUrl: booking.label_url,
                    courierProvider: booking.courier_provider,
                    bookedAt: new Date(),
                },
            });

            results.push({ id, success: true, order: updated });
        } catch (err: any) {
            results.push({ id, success: false, error: err.message });
        }
    }

    return NextResponse.json({ results });
}