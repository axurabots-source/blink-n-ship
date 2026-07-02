import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/courierHelpers';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { shipmentIds } = await request.json();
        if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
            return NextResponse.json({ error: 'shipmentIds array is required' }, { status: 400 });
        }

        const shipments = await prisma.shipment.findMany({
            where: { id: { in: shipmentIds }, userId: user.id },
        });

        const labels = [];
        for (const shipment of shipments) {
            if (!shipment.trackingNumber) continue;
            const label = await prisma.label.upsert({
                where: {
                    id: (await prisma.label.findFirst({ where: { shipmentId: shipment.id, userId: user.id }, select: { id: true } }))?.id ?? '00000000-0000-0000-0000-000000000000',
                },
                update: { labelUrl: shipment.labelUrl, generatedAt: new Date() },
                create: {
                    userId: user.id,
                    shipmentId: shipment.id,
                    trackingNumber: shipment.trackingNumber,
                    labelUrl: shipment.labelUrl,
                    format: 'pdf',
                    generatedAt: new Date(),
                },
            });
            labels.push(label);
        }

        await logActivity(user.id, 'label_generated', `Bulk generated ${labels.length} labels`, null, 'sync', { count: labels.length });
        return NextResponse.json({ success: true, labels });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
