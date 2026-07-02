import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/courierHelpers';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { name, contactPerson, phone, address, city, area, isDefault, isActive } = body;

        const existing = await prisma.pickupLocation.findFirst({
            where: { id, userId: user.id },
        });
        if (!existing) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

        if (isDefault) {
            await prisma.pickupLocation.updateMany({
                where: { userId: user.id, id: { not: id } },
                data: { isDefault: false },
            });
        }

        const location = await prisma.pickupLocation.update({
            where: { id },
            data: { name, contactPerson, phone, address, city, area, isDefault, isActive, updatedAt: new Date() },
        });

        return NextResponse.json({ location });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;

        const existing = await prisma.pickupLocation.findFirst({
            where: { id, userId: user.id },
        });
        if (!existing) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

        await prisma.pickupLocation.delete({ where: { id } });
        await logActivity(user.id, 'sync', `Deleted pickup location: ${existing.name}`, id, 'pickup_location');

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
