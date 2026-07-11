import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { sanitizeString, sanitizeOptionalString } from '@/lib/validation';
import { apiError } from '@/lib/api-error';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: {
                id: true, businessName: true, accountType: true,
                flashipConnected: true, ownerName: true,
                email: true, phone: true, address: true,
                logoUrl: true, website: true,
            },
        });

        return NextResponse.json({ profile });
    } catch (err: any) {
        return apiError(err);
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await request.json();
        const updates: Record<string, any> = {};

        if (body.businessName !== undefined) updates.businessName = sanitizeString(body.businessName, 200);
        if (body.ownerName !== undefined) updates.ownerName = sanitizeString(body.ownerName, 200);
        if (body.email !== undefined) updates.email = sanitizeString(body.email, 200);
        if (body.phone !== undefined) updates.phone = sanitizeOptionalString(body.phone, 20);
        if (body.address !== undefined) updates.address = sanitizeString(body.address, 500);
        if (body.logoUrl !== undefined) updates.logoUrl = sanitizeString(body.logoUrl, 500);
        if (body.website !== undefined) updates.website = sanitizeString(body.website, 200);

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const profile = await prisma.profile.update({
            where: { id: user.id },
            data: updates,
        });

        return NextResponse.json({ profile });
    } catch (err: any) {
        return apiError(err);
    }
}
