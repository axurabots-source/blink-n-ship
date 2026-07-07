import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/courierHelpers';
import { syncCourierData } from '@/lib/sync-service';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        const types: string[] = body.types || ['companies', 'pickup_locations', 'cities', 'rate_cards', 'tracking'];

        const startMs = Date.now();
        const referenceTypes = types.filter(t => t !== 'tracking');
        
        let syncOutcome = {
            success: true,
            results: {} as any,
            totalSynced: 0,
            totalSkipped: 0,
            durationMs: 0
        };

        if (referenceTypes.length > 0) {
            syncOutcome = await syncCourierData(user.id, referenceTypes);
        }

        const results = { ...syncOutcome.results };
        let totalSkipped = syncOutcome.totalSkipped;

        // Sync active shipment tracking
        if (types.includes('tracking')) {
            try {
                const activeShipments = await prisma.shipment.findMany({
                    where: { userId: user.id, status: { in: ['booked', 'in_transit', 'out_for_delivery'] } },
                    select: { id: true, trackingNumber: true },
                });
                let updated = 0;
                for (const shipment of activeShipments) {
                    if (!shipment.trackingNumber) continue;
                    try {
                        await fetch(`/api/courier/track`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ trackingNumber: shipment.trackingNumber }),
                        });
                        updated++;
                    } catch (_) { /* skip failed individual tracking */ }
                }
                results['tracking'] = { success: true, count: updated, skipped: 0 };
            } catch (e: any) { 
                results['tracking'] = { success: false, error: e.message }; 
            }
        }

        const durationMs = Date.now() - startMs;
        const allSuccess = Object.values(results).every((r: any) => r.success);

        return NextResponse.json({
            success: allSuccess,
            results,
            durationMs,
            totalSkipped
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
