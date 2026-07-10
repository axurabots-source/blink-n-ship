import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/courierHelpers';
import { apiError } from '@/lib/api-error';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const locations = await prisma.pickupLocation.findMany({
            where: { userId: user.id },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });

        return NextResponse.json({ locations });
    } catch (err: any) {
        return apiError(err);
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await request.json();
        const { name, contactPerson, phone, address, city, area, isDefault } = body;

        if (!name || !city) {
            return NextResponse.json({ error: 'Name and city are required' }, { status: 400 });
        }

        const location = await prisma.$transaction(async (tx) => {
            // If setting as default, unset others
            if (isDefault) {
                await tx.pickupLocation.updateMany({
                    where: { userId: user.id },
                    data: { isDefault: false },
                });
            }

            return tx.pickupLocation.create({
                data: {
                    userId: user.id,
                    provider: 'manual',
                    name,
                    contactPerson,
                    phone,
                    address,
                    city,
                    area,
                    isDefault: isDefault ?? false,
                },
            });
        });

        await logActivity(user.id, 'sync', `Added pickup location: ${name}`, location.id, 'pickup_location');
        return NextResponse.json({ location }, { status: 201 });
    } catch (err: any) {
        return apiError(err);
    }
}
