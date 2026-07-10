import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fetchPickupLocations } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';
import { validatePickupLocations } from '@/lib/flaship-adapter';
import { apiError } from '@/lib/api-error';
import { log } from '@/lib/logger';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const data = await fetchPickupLocations(user.id);
        const locations = data.locations || [];

        const { valid, skipped } = validatePickupLocations(locations);
        if (skipped.length > 0) {
            log.warn('COURIER', 'Sync Pickup Locations skipped invalid records', { count: skipped.length });
        }

        await prisma.$transaction(async (tx) => {
            await tx.pickupLocation.deleteMany({ where: { userId: user.id, provider: 'flaship' } });

            if (valid.length > 0) {
                await tx.pickupLocation.createMany({
                    data: valid.map((l: any) => ({
                        userId: user.id,
                        provider: 'flaship',
                        externalId: l.id,
                        name: l.name,
                        contactPerson: l.contact_person,
                        phone: l.phone,
                        address: l.address,
                        city: l.city,
                        area: l.area,
                        isDefault: l.is_default ?? false,
                        rawData: l,
                    })),
                });
            }
        });

        await logActivity(user.id, 'sync', `Synced ${valid.length} pickup locations (skipped ${skipped.length})`, null, 'sync', { count: valid.length, skipped: skipped.length });
        return NextResponse.json({ success: true, count: valid.length, skipped: skipped.length });
    } catch (err: any) {
        return apiError(err);
    }
}
