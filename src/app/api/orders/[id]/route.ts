import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

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
    ];

    const updates: Record<string, any> = {};
    for (const key of allowed) {
        if (key in body) updates[key] = body[key];
    }

    if (updates.costPrice != null && updates.sellingPrice != null) {
        updates.profit = Number(updates.sellingPrice) - Number(updates.costPrice);
    }

    const order = await prisma.order.update({
        where: { id, userId: user.id },
        data: updates,
    });

    return NextResponse.json(order);
}