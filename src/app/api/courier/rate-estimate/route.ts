import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// GET /api/courier/rate-estimate?weight=1.5&city=Lahore&company=tcs
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const weight = parseFloat(searchParams.get('weight') || '0');
        const city = searchParams.get('city') || '';
        const company = searchParams.get('company') || '';

        if (!weight || !city) {
            return NextResponse.json({ shippingCost: null, serviceOptions: [] });
        }

        // Auto-determine service type label (for reference / suggestion only — NOT used as a DB filter)
        const suggested = weight > 3 ? 'overland' : weight > 1 ? 'detain' : 'overnight';

        // Look up the destination city zone from our synced OperationalCity table
        const destCity = await prisma.operationalCity.findFirst({
            where: {
                userId: user.id,
                OR: [
                    { name: { contains: city, mode: 'insensitive' } },
                    { code: { contains: city, mode: 'insensitive' } },
                ],
            },
        });

        const destZone = destCity?.zone || null;

        // Fetch ALL rate cards for this merchant — let weight slab do the matching.
        // Do NOT filter by serviceType: the stored values come straight from Flaship and
        // may not match the suggested label (e.g. Flaship stores "OVL" not "overland").
        const baseWhere: any = { userId: user.id };
        if (company) baseWhere.companyCode = { contains: company, mode: 'insensitive' };
        if (destZone) baseWhere.destinationZone = destZone;

        const cards = await prisma.rateCard.findMany({ where: baseWhere });

        // If zone filter returned nothing, retry without zone constraint so we always
        // show *something* rather than an empty estimate.
        const effectiveCards =
            cards.length > 0
                ? cards
                : await prisma.rateCard.findMany({
                      where: {
                          userId: user.id,
                          ...(company ? { companyCode: { contains: company, mode: 'insensitive' } } : {}),
                      },
                  });

        // Group by company
        const groups: Record<string, typeof effectiveCards> = {};
        for (const rc of effectiveCards) {
            const key = (rc.companyCode || 'unknown').toLowerCase();
            if (!groups[key]) groups[key] = [];
            groups[key].push(rc);
        }

        const serviceOptions = [];

        for (const [, companyCards] of Object.entries(groups)) {
            // 1. Try to find a card whose weight slab covers the actual weight
            let best = companyCards.find(
                (rc) =>
                    rc.weightSlabMin != null &&
                    rc.weightSlabMax != null &&
                    Number(rc.weightSlabMin) <= weight &&
                    Number(rc.weightSlabMax) >= weight,
            );

            // 2. Fallback: pick the card with the highest slab max (closest to an "any weight" card)
            if (!best) {
                best = companyCards[0];
                for (const rc of companyCards) {
                    if (
                        rc.weightSlabMax != null &&
                        (best.weightSlabMax == null ||
                            Number(rc.weightSlabMax) > Number(best.weightSlabMax))
                    ) {
                        best = rc;
                    }
                }
            }

            if (!best) continue;

            const base = Number(best.baseRate || 0);
            const cod = Number(best.codCharges || 0);
            const fuel = Number(best.fuelSurcharge || 0);
            const subtotal = base + cod + fuel;
            const gst = Math.round(subtotal * 0.16); // 16% GST
            const total = subtotal + gst;

            serviceOptions.push({
                company: best.companyCode,
                serviceType: best.serviceType,
                shippingCost: total,
                breakdown: {
                    base,
                    additionalCharges: 0,
                    cod,
                    fuel,
                    gst,
                    subtotal,
                },
                zone: best.destinationZone,
            });
        }

        const primaryCost =
            serviceOptions.length > 0
                ? Math.min(...serviceOptions.map((s) => s.shippingCost))
                : null;

        return NextResponse.json({
            weight,
            city,
            destZone,
            suggested,
            serviceOptions,
            shippingCost: primaryCost,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
