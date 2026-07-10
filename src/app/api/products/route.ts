import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { sanitizeString, sanitizeOptionalString, validatePositiveNumber } from '@/lib/validation';
import { apiError } from '@/lib/api-error';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const products = await prisma.product.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        return NextResponse.json({ products });
    } catch (err) {
        return apiError(err);
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const raw = await req.json();
        const name = sanitizeString(raw.name, 200);
        const sku = sanitizeOptionalString(raw.sku, 100);
        const costPrice = validatePositiveNumber(raw.cost_price, 0);
        const stockQuantity = validatePositiveNumber(raw.stock_quantity, 0);
        const weight = validatePositiveNumber(raw.weight, 0);

        if (!name) {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                userId: user.id,
                name,
                sku,
                costPrice,
                stockQuantity,
                weight,
            },
        });

        return NextResponse.json(product);
    } catch (err) {
        return apiError(err);
    }
}