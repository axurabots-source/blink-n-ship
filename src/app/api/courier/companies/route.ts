import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const companies = await prisma.courierCompany.findMany({
            where: { userId: user.id },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });

        return NextResponse.json({ companies });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
