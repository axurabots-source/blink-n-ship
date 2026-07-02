import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const rateCards = await prisma.rateCard.findMany({
            where: { userId: user.id },
            orderBy: [{ companyCode: 'asc' }, { baseRate: 'asc' }],
        });

        return NextResponse.json({ rateCards });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
