import { prisma } from '@/lib/prisma';
import {
    fetchCourierCompanies,
    fetchPickupLocations,
    fetchOperationalCities,
    fetchRateCards,
} from '@/lib/flaship';
import {
    validateCompanies,
    validateCities,
    validatePickupLocations,
    validateRateCards,
} from '@/lib/flaship-adapter';
import { logActivity } from '@/lib/courierHelpers';

export interface SyncOutcome {
    success: boolean;
    results: Record<string, { success: boolean; count?: number; skipped?: number; error?: string }>;
    totalSynced: number;
    totalSkipped: number;
    durationMs: number;
}

export async function syncCourierData(
    userId: string,
    types: string[] = ['companies', 'pickup_locations', 'cities', 'rate_cards']
): Promise<SyncOutcome> {
    const log = await prisma.syncLog.create({
        data: { userId, provider: 'flaship', syncType: 'full', status: 'running', startedAt: new Date() },
    });

    const results: Record<string, { success: boolean; count?: number; skipped?: number; error?: string }> = {};
    const startMs = Date.now();
    let totalSkipped = 0;
    let totalSynced = 0;

    // 1. Sync companies
    if (types.includes('companies')) {
        try {
            const data = await fetchCourierCompanies(userId);
            const companies = data.couriers || [];
            const { valid, skipped } = validateCompanies(companies);
            totalSkipped += skipped.length;
            
            await prisma.courierCompany.deleteMany({ where: { userId, provider: 'flaship' } });
            if (valid.length > 0) {
                await prisma.courierCompany.createMany({
                    data: valid.map((c: any) => ({
                        userId, provider: 'flaship', externalId: c.id,
                        name: c.name, code: c.code, isActive: c.active ?? true,
                        isDefault: c.is_default ?? false, rawData: c,
                    })),
                });
            }
            results['companies'] = { success: true, count: valid.length, skipped: skipped.length };
            totalSynced += valid.length;
        } catch (e: any) { 
            results['companies'] = { success: false, error: e.message }; 
        }
    }

    // 2. Sync pickup locations
    if (types.includes('pickup_locations')) {
        try {
            const data = await fetchPickupLocations(userId);
            const locs = data.locations || [];
            const { valid, skipped } = validatePickupLocations(locs);
            totalSkipped += skipped.length;
            
            await prisma.pickupLocation.deleteMany({ where: { userId, provider: 'flaship' } });
            if (valid.length > 0) {
                await prisma.pickupLocation.createMany({
                    data: valid.map((l: any) => ({
                        userId, provider: 'flaship', externalId: l.id,
                        name: l.name, contactPerson: l.contact_person, phone: l.phone,
                        address: l.address, city: l.city, area: l.area,
                        isDefault: l.is_default ?? false, rawData: l,
                    })),
                });
            }
            results['pickup_locations'] = { success: true, count: valid.length, skipped: skipped.length };
            totalSynced += valid.length;
        } catch (e: any) { 
            results['pickup_locations'] = { success: false, error: e.message }; 
        }
    }

    // 3. Sync cities
    if (types.includes('cities')) {
        try {
            const data = await fetchOperationalCities(userId);
            const cities = data.cities || [];
            const { valid, skipped } = validateCities(cities);
            totalSkipped += skipped.length;
            
            await prisma.operationalCity.deleteMany({ where: { userId, provider: 'flaship' } });
            if (valid.length > 0) {
                await prisma.operationalCity.createMany({
                    data: valid.map((c: any) => ({
                        userId, provider: 'flaship', externalId: c.id,
                        name: c.name, code: c.code, zone: c.zone, isActive: c.active ?? true, rawData: c,
                    })),
                });
            }
            results['cities'] = { success: true, count: valid.length, skipped: skipped.length };
            totalSynced += valid.length;
        } catch (e: any) { 
            results['cities'] = { success: false, error: e.message }; 
        }
    }

    // 4. Sync rate cards
    if (types.includes('rate_cards')) {
        try {
            const data = await fetchRateCards(userId);
            const rates = data.rates || [];
            const { valid, skipped } = validateRateCards(rates);
            totalSkipped += skipped.length;
            
            await prisma.rateCard.deleteMany({ where: { userId, provider: 'flaship' } });
            if (valid.length > 0) {
                await prisma.rateCard.createMany({
                    data: valid.map((r: any) => ({
                        userId, provider: 'flaship', externalId: r.id,
                        companyCode: r.company_code, serviceType: r.service_type,
                        originZone: r.origin, destinationZone: r.destination,
                        weightSlabMin: r.min_w, weightSlabMax: r.max_w,
                        baseRate: r.base, perKgRate: r.extra, codCharges: r.cod_fee,
                        fuelSurcharge: r.fuel, rawData: r,
                    })),
                });
            }
            results['rate_cards'] = { success: true, count: valid.length, skipped: skipped.length };
            totalSynced += valid.length;
        } catch (e: any) { 
            results['rate_cards'] = { success: false, error: e.message }; 
        }
    }

    const durationMs = Date.now() - startMs;
    const allSuccess = Object.values(results).every(r => r.success);

    await prisma.syncLog.update({
        where: { id: log.id },
        data: {
            status: allSuccess ? 'success' : 'failed',
            recordsSynced: totalSynced,
            completedAt: new Date(),
            durationMs,
            errorMessage: allSuccess ? (totalSkipped > 0 ? `Skipped ${totalSkipped} invalid records` : null) : JSON.stringify(results),
        },
    });

    await logActivity(
        userId,
        'sync',
        `Sync completed: ${totalSynced} records synced, ${totalSkipped} skipped`,
        log.id,
        'sync',
        { results, totalSkipped }
    );

    return {
        success: allSuccess,
        results,
        totalSynced,
        totalSkipped,
        durationMs,
    };
}
