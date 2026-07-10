import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
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
