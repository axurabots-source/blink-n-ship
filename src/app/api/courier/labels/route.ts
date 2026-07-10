import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateLabel } from '@/lib/flaship';
import { apiError } from '@/lib/api-error';

const FLASHIP_BASE = process.env.FLASHIP_BASE_URL || 'https://partners.flaship.pk';

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
            const buf = result.data;
            const ab = buf
                ? (buf as Uint8Array).buffer.slice((buf as Uint8Array).byteOffset, (buf as Uint8Array).byteOffset + (buf as Uint8Array).byteLength)
                : new ArrayBuffer(0);
            return new Response(ab as BodyInit, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'inline; filename="labels.pdf"',
                },
            });
        }

        // Flaship may return a relative URL — resolve to absolute.
        const rawUrl: string | null = result.labelUrl || (result as any).raw?.label_url || null;
        const labelUrl = rawUrl && rawUrl.startsWith('/') ? `${FLASHIP_BASE}${rawUrl}` : rawUrl;

        return NextResponse.json({ success: true, labelUrl });
    } catch (err: any) {
        return apiError(err);
    }
}
