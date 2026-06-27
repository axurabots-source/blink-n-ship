import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { account_type, business_name } = await req.json();

    if (!['inventory_holder', 'reseller'].includes(account_type)) {
        return NextResponse.json(
            { error: 'account_type must be inventory_holder or reseller' },
            { status: 400 }
        );
    }

    const profile = await prisma.profile.upsert({
        where: { id: user.id },
        update: { accountType: account_type, businessName: business_name },
        create: {
            id: user.id,
            accountType: account_type,
            businessName: business_name,
        },
    });

    return NextResponse.json(profile);
}