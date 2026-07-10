import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fetchRateCards } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';
import { validateRateCards } from '@/lib/flaship-adapter';
import { apiError } from '@/lib/api-error';
import { log } from '@/lib/logger';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const data = await fetchRateCards(user.id);
        const rates = data.rates || [];

        const { valid, skipped } = validateRateCards(rates);
        if (skipped.length > 0) {
            log.warn('COURIER', 'Sync Rate Cards skipped invalid records', { count: skipped.length });
        }

        await prisma.$transaction(async (tx) => {
            await tx.rateCard.deleteMany({ where: { userId: user.id, provider: 'flaship' } });

            if (valid.length > 0) {
                await tx.rateCard.createMany({
                    data: valid.map((r: any) => ({
                        userId: user.id,
                        provider: 'flaship',
                        externalId: r.id,
                        companyCode: r.company_code,
                        serviceType: r.service_type,
                        originZone: r.origin,
                        destinationZone: r.destination,
                        weightSlabMin: r.min_w,
                        weightSlabMax: r.max_w,
                        baseRate: r.base,
                        perKgRate: r.extra,
                        codCharges: r.cod_fee,
                        fuelSurcharge: r.fuel,
                        rawData: r,
                    })),
                });
            }
        });

        await logActivity(user.id, 'sync', `Synced ${valid.length} rate cards (skipped ${skipped.length})`, null, 'sync', { count: valid.length, skipped: skipped.length });
        return NextResponse.json({ success: true, count: valid.length, skipped: skipped.length });
    } catch (err: any) {
        return apiError(err);
    }
}
