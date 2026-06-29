import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name, sku, cost_price, stock_quantity, weight } = await req.json();

    if (!name) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const product = await prisma.product.create({
        data: {
            userId: user.id,
            name,
            sku: sku || null,
            costPrice: cost_price || 0,
            stockQuantity: stock_quantity || 0,
            weight: weight || 0,
        },
    });

    return NextResponse.json(product);
}