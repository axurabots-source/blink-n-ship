import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const [booked, cancelled, inTransit, delivered] = await Promise.all([
            prisma.order.count({ where: { userId: user.id, status: 'booked' } }),
            prisma.shipment.count({ where: { userId: user.id, status: 'cancelled' } }),
            prisma.shipment.count({ where: { userId: user.id, status: 'in_transit' } }),
            prisma.shipment.count({ where: { userId: user.id, status: 'delivered' } }),
        ]);

        return NextResponse.json({ booked, cancelled, inTransit, delivered });
    } catch (err: any) {
        return apiError(err);
    }
}
