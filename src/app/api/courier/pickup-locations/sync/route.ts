import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fetchPickupLocations } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const data = await fetchPickupLocations(user.id);
        const locations = data.locations || [];

        await prisma.pickupLocation.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
        await prisma.pickupLocation.createMany({
            data: locations.map((l: any) => ({
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

        await logActivity(user.id, 'sync', `Synced ${locations.length} pickup locations`, null, 'sync');
        return NextResponse.json({ success: true, count: locations.length });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
