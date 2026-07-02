import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { cancelShipment } from '@/lib/flaship';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const allowed = [
        'customerName', 'phoneNumber', 'address', 'city',
        'productInfo', 'quantity', 'productId', 'costPrice', 'sellingPrice',
        'shippingType', 'weight', 'status'
    ];

    const updates: Record<string, any> = {};
    for (const key of allowed) {
        if (key in body) updates[key] = body[key];
    }

    const existing = await prisma.order.findUnique({ where: { id, userId: user.id } });
    if (!existing) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Profit recalculation if costPrice or sellingPrice is being modified
    if ('costPrice' in updates || 'sellingPrice' in updates) {
        const cost = updates.costPrice !== undefined ? updates.costPrice : existing.costPrice;
        const sell = updates.sellingPrice !== undefined ? updates.sellingPrice : existing.sellingPrice;
        if (cost != null && sell != null) {
            updates.profit = Number(sell) - Number(cost);
        } else {
            updates.profit = null;
        }
    }

    // Unbooking handler: status change from booked -> draft
    if (updates.status === 'draft' && existing.status === 'booked') {
        // Call Flaship cancel API if tracking number exists
        if (existing.trackingNumber) {
            try {
                await cancelShipment(user.id, existing.trackingNumber);
            } catch (cancelErr: any) {
                console.warn(`Flaship cancel warning for ${existing.trackingNumber}:`, cancelErr.message);
            }
        }
        updates.trackingNumber = null;
        updates.labelUrl = null;
        updates.courierProvider = null;
        updates.courierStatus = null;
        updates.shipmentId = null;
        updates.bookedAt = null;

        if (existing.productId) {
            await prisma.product.update({
                where: { id: existing.productId },
                data: { stockQuantity: { increment: existing.quantity } },
            });
        }
    }

    const order = await prisma.order.update({
        where: { id, userId: user.id },
        data: updates,
    });

    return NextResponse.json(order);
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch order first to check if we need to return stock (if it was booked)
    const existing = await prisma.order.findUnique({ where: { id, userId: user.id } });
    if (!existing) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If order was booked, we return the stock first
    if (existing.status === 'booked' && existing.productId) {
        await prisma.product.update({
            where: { id: existing.productId },
            data: { stockQuantity: { increment: existing.quantity } },
        });
    }

    await prisma.order.delete({
        where: { id, userId: user.id },
    });

    return NextResponse.json({ deleted: true });
}