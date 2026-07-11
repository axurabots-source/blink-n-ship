import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { sanitizeString, sanitizeOptionalString } from '@/lib/validation';
import { apiError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { account_type, business_name, phone } = await req.json();

        if (!['inventory_holder', 'reseller'].includes(account_type)) {
            return NextResponse.json(
                { error: 'account_type must be inventory_holder or reseller' },
                { status: 400 }
            );
        }

        const updateData: Record<string, any> = { accountType: account_type };
        if (business_name !== undefined) updateData.businessName = sanitizeString(business_name, 200);
        if (phone !== undefined) updateData.phone = sanitizeOptionalString(phone, 20);

        const profile = await prisma.profile.upsert({
            where: { id: user.id },
            update: updateData,
            create: {
                id: user.id,
                accountType: account_type,
                ...(business_name !== undefined ? { businessName: sanitizeString(business_name, 200) } : {}),
                ...(phone !== undefined ? { phone: sanitizeOptionalString(phone, 20) } : {}),
            },
        });

        return NextResponse.json(profile);
    } catch (err) {
        return apiError(err);
    }
}
