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

    const allowed = ['name', 'sku', 'imageUrl', 'costPrice', 'stockQuantity', 'weight'];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
        if (key in body) updates[key] = body[key];
    }

    const product = await prisma.product.update({
        where: { id, userId: user.id },
        data: updates,
    });

    return NextResponse.json(product);
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

    await prisma.product.delete({
        where: { id, userId: user.id },
    });

    return NextResponse.json({ deleted: true });
}