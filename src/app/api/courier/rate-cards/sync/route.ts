import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fetchRateCards } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const data = await fetchRateCards(user.id);
        const rates = data.rates || [];

        await prisma.rateCard.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
        await prisma.rateCard.createMany({
            data: rates.map((r: any) => ({
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

        await logActivity(user.id, 'sync', `Synced ${rates.length} rate cards`, null, 'sync');
        return NextResponse.json({ success: true, count: rates.length });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
