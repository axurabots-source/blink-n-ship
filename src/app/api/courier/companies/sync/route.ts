import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fetchCourierCompanies } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const data = await fetchCourierCompanies(user.id);
        const companies = data.couriers || [];

        await prisma.courierCompany.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
        await prisma.courierCompany.createMany({
            data: companies.map((c: any) => ({
                userId: user.id,
                provider: 'flaship',
                externalId: c.id,
                name: c.name,
                code: c.code,
                isActive: c.active ?? true,
                isDefault: c.is_default ?? false,
                rawData: c,
            })),
        });

        await logActivity(user.id, 'sync', `Synced ${companies.length} courier companies`, null, 'sync', { count: companies.length });

        return NextResponse.json({ success: true, count: companies.length });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
