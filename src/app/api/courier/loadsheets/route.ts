import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEligibleLoadsheetOrders, generateLoadsheet } from '@/lib/flaship';

const FLASHIP_BASE = 'https://partners.flaship.pk';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { cns } = await request.json();
        if (!Array.isArray(cns) || cns.length === 0) {
            return NextResponse.json({ error: 'cns array is required' }, { status: 400 });
        }

        // ── Step 1: fetch which CNs Flaship considers eligible for loadsheet ──
        // Flaship rejects /api/loadsheet/ with "No order found" if any CN is not
        // in the eligible list (already on a loadsheet, wrong status, etc.).
        let eligibleCns: string[] = [];
        try {
            eligibleCns = await getEligibleLoadsheetOrders(user.id);
            console.log('[Loadsheet] eligible CNs from Flaship:', eligibleCns);
        } catch (e: any) {
            console.warn('[Loadsheet] Could not fetch eligible orders, will try with provided CNs:', e.message);
            // Fall back to submitting the requested CNs directly
            eligibleCns = cns;
        }

        // ── Step 2: filter requested CNs to only those that are eligible ──
        const toSubmit = cns.filter((cn) => eligibleCns.includes(cn));
        console.log('[Loadsheet] requested:', cns, '→ eligible to submit:', toSubmit);

        if (toSubmit.length === 0) {
            return NextResponse.json({
                success: false,
                loadsheetUrl: null,
                loadsheetId: null,
                generatedCount: 0,
                error: `None of the selected ${cns.length} order(s) are currently eligible for loadsheet generation. They may already have a loadsheet or may not yet be in "Booked" status on Flaship.`,
            });
        }

        // ── Step 3: generate the loadsheet with eligible CNs ──
        const result = await generateLoadsheet(user.id, toSubmit);
        console.log('[Loadsheet] raw response:', JSON.stringify(result.raw));

        if (!result.success) {
            const reason = (result.raw as any)?.reason || 'Flaship rejected the loadsheet request.';
            return NextResponse.json({ success: false, error: reason }, { status: 422 });
        }

        // Flaship returns a relative path e.g. "/media/merchant/loadsheets/123/5234.pdf"
        // Resolve to absolute URL so the browser can open it.
        const rawUrl: string | null = result.loadsheetUrl ?? (result.raw as any)?.url ?? null;
        const loadsheetUrl = rawUrl?.startsWith('/') ? `${FLASHIP_BASE}${rawUrl}` : rawUrl ?? null;

        return NextResponse.json({
            success: true,
            loadsheetUrl,
            loadsheetId: result.loadsheetId,
            generatedCount: result.generatedCount,
            submittedCount: toSubmit.length,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
