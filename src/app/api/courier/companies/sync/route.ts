import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fetchCourierCompanies } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';
import { validateCompanies } from '@/lib/flaship-adapter';
import { apiError } from '@/lib/api-error';
import { log } from '@/lib/logger';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const data = await fetchCourierCompanies(user.id);
        const companies = data.couriers || [];
        
        const { valid, skipped } = validateCompanies(companies);
        if (skipped.length > 0) {
            log.warn('COURIER', 'Sync Companies skipped invalid records', { count: skipped.length });
        }

        await prisma.$transaction(async (tx) => {
            await tx.courierCompany.deleteMany({ where: { userId: user.id, provider: 'flaship' } });

            if (valid.length > 0) {
                await tx.courierCompany.createMany({
                    data: valid.map((c: any) => ({
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
            }
        });

        await logActivity(user.id, 'sync', `Synced ${valid.length} courier companies (skipped ${skipped.length})`, null, 'sync', { count: valid.length, skipped: skipped.length });

        return NextResponse.json({ success: true, count: valid.length, skipped: skipped.length });
    } catch (err: any) {
        return apiError(err);
    }
}
