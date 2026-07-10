import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/courierHelpers';
import { apiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ shipmentId: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { shipmentId } = await params;

        const shipment = await prisma.shipment.findFirst({
            where: { id: shipmentId, userId: user.id },
        });

        if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
        if (!shipment.trackingNumber) return NextResponse.json({ error: 'No tracking number on this shipment' }, { status: 400 });

        // Check if label already exists
        let label = await prisma.label.findFirst({
            where: { shipmentId, userId: user.id },
            orderBy: { generatedAt: 'desc' },
        });

        // If labelUrl from booking is available, use it directly
        if (!label && shipment.labelUrl) {
            label = await prisma.label.create({
                data: {
                    userId: user.id,
                    shipmentId,
                    trackingNumber: shipment.trackingNumber,
                    labelUrl: shipment.labelUrl,
                    format: 'pdf',
                    generatedAt: new Date(),
                },
            });

            await logActivity(user.id, 'label_generated', `Label generated for ${shipment.trackingNumber}`, shipmentId, 'shipment');
        }

        // TODO(real): If no labelUrl from booking, call Flaship label generation API
        // URL: GET https://api.flaship.pe/v1/labels/{trackingNumber}

        return NextResponse.json({ label, labelUrl: label?.labelUrl || shipment.labelUrl });
    } catch (err: any) {
        return apiError(err);
    }
}
