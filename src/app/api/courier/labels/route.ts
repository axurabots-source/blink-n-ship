import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateLabel } from '@/lib/flaship';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { cns } = await request.json();
        if (!Array.isArray(cns) || cns.length === 0) {
            return NextResponse.json({ error: 'cns array is required' }, { status: 400 });
        }

        const result = await generateLabel(user.id, cns);

        if (result._binary) {
            return new Response(result.data, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'inline; filename="labels.pdf"',
                },
            });
        }

        return NextResponse.json({ success: true, labelUrl: result.labelUrl || result.raw?.label_url });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
