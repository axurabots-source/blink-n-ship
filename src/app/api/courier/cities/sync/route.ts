import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fetchOperationalCities } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';
import { validateCities } from '@/lib/flaship-adapter';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const data = await fetchOperationalCities(user.id);
        const cities = data.cities || [];

        const { valid, skipped } = validateCities(cities);
        if (skipped.length > 0) {
            console.warn(`[Sync Cities] Skipped ${skipped.length} invalid records:`, JSON.stringify(skipped));
        }

        await prisma.operationalCity.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
        
        if (valid.length > 0) {
            await prisma.operationalCity.createMany({
                data: valid.map((c: any) => ({
                    userId: user.id,
                    provider: 'flaship',
                    externalId: c.id,
                    name: c.name,
                    code: c.code,
                    zone: c.zone,
                    isActive: c.active ?? true,
                    rawData: c,
                })),
            });
        }

        await logActivity(user.id, 'sync', `Synced ${valid.length} operational cities (skipped ${skipped.length})`, null, 'sync', { count: valid.length, skipped: skipped.length });
        return NextResponse.json({ success: true, count: valid.length, skipped: skipped.length });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
