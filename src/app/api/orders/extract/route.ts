import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { extractOrders } from '@/lib/orderExtraction';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { raw_text } = await req.json();

    if (!raw_text || !raw_text.trim()) {
        return NextResponse.json({ error: 'raw_text is required' }, { status: 400 });
    }

    try {
        const extracted = await extractOrders(raw_text);

        const created = await prisma.$transaction(
            extracted.map((o) =>
                prisma.order.create({
                    data: {
                        userId: user.id,
                        customerName: o.customer_name || '',
                        phoneNumber: o.phone_number || '',
                        address: o.address || '',
                        city: o.city || '',
                        productInfo: o.product_info || '',
                        quantity: o.quantity || 1,
                        rawInput: raw_text,
                        status: 'draft',
                    },
                })
            )
        );

        return NextResponse.json({ orders: created });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}