import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        return NextResponse.json({ profile });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
