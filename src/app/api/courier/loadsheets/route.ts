import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateLoadsheet } from '@/lib/flaship';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { cns } = await request.json();
        if (!Array.isArray(cns) || cns.length === 0) {
            return NextResponse.json({ error: 'cns array is required' }, { status: 400 });
        }

        const result = await generateLoadsheet(user.id, cns);

        return NextResponse.json({ success: true, loadsheetUrl: result.loadsheetUrl || result.raw?.loadsheet_url });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
