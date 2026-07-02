import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import {
    fetchCourierCompanies, fetchPickupLocations, fetchServiceTypes,
    fetchOperationalCities, fetchRateCards, getTrackingStatus,
} from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        const types: string[] = body.types || ['companies', 'pickup_locations', 'cities', 'rate_cards', 'tracking'];

        const log = await prisma.syncLog.create({
            data: { userId: user.id, provider: 'flaship', syncType: 'full', status: 'running', startedAt: new Date() },
        });

        const results: Record<string, { success: boolean; count?: number; error?: string }> = {};
        const startMs = Date.now();

        // Sync companies
        if (types.includes('companies')) {
            try {
                const data = await fetchCourierCompanies(user.id);
                const companies = data.couriers || [];
                await prisma.courierCompany.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
                await prisma.courierCompany.createMany({
                    data: companies.map((c: any) => ({
                        userId: user.id, provider: 'flaship', externalId: c.id,
                        name: c.name, code: c.code, isActive: c.active ?? true,
                        isDefault: c.is_default ?? false, rawData: c,
                    })),
                });
                results['companies'] = { success: true, count: companies.length };
            } catch (e: any) { results['companies'] = { success: false, error: e.message }; }
        }

        // Sync pickup locations
        if (types.includes('pickup_locations')) {
            try {
                const data = await fetchPickupLocations(user.id);
                const locs = data.locations || [];
                await prisma.pickupLocation.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
                await prisma.pickupLocation.createMany({
                    data: locs.map((l: any) => ({
                        userId: user.id, provider: 'flaship', externalId: l.id,
                        name: l.name, contactPerson: l.contact_person, phone: l.phone,
                        address: l.address, city: l.city, area: l.area,
                        isDefault: l.is_default ?? false, rawData: l,
                    })),
                });
                results['pickup_locations'] = { success: true, count: locs.length };
            } catch (e: any) { results['pickup_locations'] = { success: false, error: e.message }; }
        }

        // Sync cities
        if (types.includes('cities')) {
            try {
                const data = await fetchOperationalCities(user.id);
                const cities = data.cities || [];
                await prisma.operationalCity.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
                await prisma.operationalCity.createMany({
                    data: cities.map((c: any) => ({
                        userId: user.id, provider: 'flaship', externalId: c.id,
                        name: c.name, code: c.code, zone: c.zone, isActive: c.active ?? true, rawData: c,
                    })),
                });
                results['cities'] = { success: true, count: cities.length };
            } catch (e: any) { results['cities'] = { success: false, error: e.message }; }
        }

        // Sync rate cards
        if (types.includes('rate_cards')) {
            try {
                const data = await fetchRateCards(user.id);
                const rates = data.rates || [];
                await prisma.rateCard.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
                await prisma.rateCard.createMany({
                    data: rates.map((r: any) => ({
                        userId: user.id, provider: 'flaship', externalId: r.id,
                        companyCode: r.company_code, serviceType: r.service_type,
                        originZone: r.origin, destinationZone: r.destination,
                        weightSlabMin: r.min_w, weightSlabMax: r.max_w,
                        baseRate: r.base, perKgRate: r.extra, codCharges: r.cod_fee,
                        fuelSurcharge: r.fuel, rawData: r,
                    })),
                });
                results['rate_cards'] = { success: true, count: rates.length };
            } catch (e: any) { results['rate_cards'] = { success: false, error: e.message }; }
        }

        // Sync active shipment tracking
        if (types.includes('tracking')) {
            try {
                const activeShipments = await prisma.shipment.findMany({
                    where: { userId: user.id, status: { in: ['booked', 'in_transit', 'out_for_delivery'] } },
                    select: { id: true, trackingNumber: true },
                });
                let updated = 0;
                for (const shipment of activeShipments) {
                    if (!shipment.trackingNumber) continue;
                    try {
                        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', '') || ''}api/courier/track`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ trackingNumber: shipment.trackingNumber }),
                        });
                        updated++;
                    } catch (_) { /* skip failed individual tracking */ }
                }
                results['tracking'] = { success: true, count: updated };
            } catch (e: any) { results['tracking'] = { success: false, error: e.message }; }
        }

        const durationMs = Date.now() - startMs;
        const allSuccess = Object.values(results).every(r => r.success);
        const totalSynced = Object.values(results).reduce((acc, r) => acc + (r.count || 0), 0);

        await prisma.syncLog.update({
            where: { id: log.id },
            data: {
                status: allSuccess ? 'success' : 'failed',
                recordsSynced: totalSynced,
                completedAt: new Date(),
                durationMs,
                errorMessage: allSuccess ? null : JSON.stringify(results),
            },
        });

        await logActivity(user.id, 'sync', `Full sync completed: ${totalSynced} records`, log.id, 'sync', results);

        return NextResponse.json({ success: true, results, durationMs });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
