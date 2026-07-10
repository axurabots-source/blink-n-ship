import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;

        const shipment = await prisma.shipment.findFirst({
            where: { id, userId: user.id },
            include: {
                company: true,
                pickupLocation: true,
                timeline: { orderBy: { occurredAt: 'asc' } },
                labels: true,
                loadsheetOrders: { include: { loadsheet: true } },
            },
        });

        if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });

        // Fetch associated order
        const order = shipment.orderId ? await prisma.order.findUnique({
            where: { id: shipment.orderId },
            include: { product: { select: { name: true, sku: true } } },
        }) : null;

        return NextResponse.json({ shipment, order });
    } catch (err: any) {
        return apiError(err);
    }
}
