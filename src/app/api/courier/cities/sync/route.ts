import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fetchOperationalCities } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const data = await fetchOperationalCities(user.id);
        const cities = data.cities || [];

        await prisma.operationalCity.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
        await prisma.operationalCity.createMany({
            data: cities.map((c: any) => ({
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

        await logActivity(user.id, 'sync', `Synced ${cities.length} operational cities`, null, 'sync');
        return NextResponse.json({ success: true, count: cities.length });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
