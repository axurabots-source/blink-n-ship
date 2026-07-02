import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import {
    verifyAndFetchAccount,
    fetchPickupLocations,
    fetchCourierCompanies,
    fetchServiceTypes,
    fetchOperationalCities,
    fetchRateCards,
} from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { apiKey } = await request.json();
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
        }

        // HTTP headers only accept Latin-1 characters (ByteString, code ≤ 255).
        // Flaship API keys are always plain ASCII — reject anything with unicode.
        const cleanKey = apiKey.trim();
        if (/[^\x20-\x7E]/.test(cleanKey)) {
            return NextResponse.json({
                error: 'API key contains invalid characters (possibly a unicode arrow or emoji was pasted accidentally). Please copy the key directly from your Flaship dashboard and try again.',
            }, { status: 400 });
        }

        // Step 0: Ensure the user Profile exists to prevent foreign key constraint violations
        let profile = await prisma.profile.findUnique({
            where: { id: user.id }
        });

        if (!profile) {
            profile = await prisma.profile.create({
                data: {
                    id: user.id,
                    businessName: user.user_metadata?.business_name || 'My Business',
                    accountType: user.user_metadata?.account_type || 'reseller',
                    flashipConnected: false,
                }
            });
        }

        // Step 1: Store encrypted credentials temporarily to allow verifyAndFetchAccount
        const encryptedCredentials = encrypt(JSON.stringify({ api_key: cleanKey }));

        // Upsert courier account record
        await prisma.courierAccount.upsert({
            where: {
                id: (await prisma.courierAccount.findFirst({
                    where: { userId: user.id, provider: 'flaship' },
                    select: { id: true },
                }))?.id ?? '00000000-0000-0000-0000-000000000000',
            },
            update: {
                encryptedCredentials,
                isActive: true,
                lastVerifiedAt: new Date(),
                updatedAt: new Date(),
            },
            create: {
                userId: user.id,
                provider: 'flaship',
                authMethod: 'api_key',
                encryptedCredentials,
                isActive: true,
                connectedAt: new Date(),
                lastVerifiedAt: new Date(),
            },
        });

        // Step 2: Verify connection and fetch account metadata
        const accountData = await verifyAndFetchAccount(user.id);

        // Step 3: Upsert account metadata with real business name + phone
        await prisma.courierAccountMetadata.upsert({
            where: {
                id: (await prisma.courierAccountMetadata.findFirst({
                    where: { userId: user.id, provider: 'flaship' },
                    select: { id: true },
                }))?.id ?? '00000000-0000-0000-0000-000000000000',
            },
            update: {
                accountName: accountData.businessName,
                phone: accountData.phone,
                rawMetadata: accountData.raw,
                fetchedAt: new Date(),
                updatedAt: new Date(),
            },
            create: {
                userId: user.id,
                provider: 'flaship',
                accountName: accountData.businessName,
                phone: accountData.phone,
                rawMetadata: accountData.raw,
                fetchedAt: new Date(),
            },
        });

        // Step 4: Update profile flashipConnected flag
        await prisma.profile.update({
            where: { id: user.id },
            data: { flashipConnected: true },
        });

        // Step 5: Fetch and sync all reference data in parallel
        const [locationsData, companiesData, servicesData, citiesData, ratesData] = await Promise.allSettled([
            fetchPickupLocations(user.id),
            fetchCourierCompanies(user.id),
            fetchServiceTypes(user.id),
            fetchOperationalCities(user.id),
            fetchRateCards(user.id),
        ]);

        // ── Sync pickup locations ──────────────────────────────────────────────
        if (locationsData.status === 'fulfilled') {
            await prisma.pickupLocation.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
            const locs = locationsData.value.locations || [];
            if (locs.length > 0) {
                await prisma.pickupLocation.createMany({
                    data: locs.map((l: any, idx: number) => {
                        const isObj = typeof l === 'object' && l !== null;
                        return {
                            userId: user.id,
                            provider: 'flaship',
                            externalId: isObj ? String(l.id ?? idx) : String(idx),
                            name: isObj ? (l.name || l.shipperName || l.address?.slice(0, 50) || `Location ${idx + 1}`) : `Location ${idx + 1}`,
                            contactPerson: isObj ? (l.contact_person || l.shipperName || 'Contact') : 'Contact',
                            phone: isObj ? (l.phone || l.shipperPhone || '00000000000') : '00000000000',
                            address: isObj ? (l.address || '') : String(l),
                            city: isObj ? (l.city || 'Karachi') : 'Karachi',
                            area: isObj ? (l.area || '') : '',
                            isDefault: isObj ? (l.is_default ?? idx === 0) : idx === 0,
                            rawData: l,
                        };
                    }),
                });
            }
        }

        // ── Sync courier companies ──────────────────────────────────────────────
        if (companiesData.status === 'fulfilled') {
            await prisma.courierCompany.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
            const companies = companiesData.value.couriers || [];
            if (companies.length > 0) {
                await prisma.courierCompany.createMany({
                    data: companies.map((c: any, idx: number) => {
                        const isObj = typeof c === 'object' && c !== null;
                        const name = isObj ? (c.name || c.label || String(c)) : String(c);
                        const code = isObj ? (c.code || c.slug || name.toLowerCase().replace(/\s+/g, '_')) : name.toLowerCase().replace(/\s+/g, '_');
                        return {
                            userId: user.id,
                            provider: 'flaship',
                            externalId: isObj ? String(c.id ?? code) : code,
                            name,
                            code,
                            isActive: isObj ? (c.active ?? true) : true,
                            isDefault: isObj ? (c.is_default ?? idx === 0) : idx === 0,
                            rawData: c,
                        };
                    }),
                });
            }
        }

        // ── Sync service types (derived — companies are strings so no service subtypes) ─
        if (servicesData.status === 'fulfilled') {
            await prisma.serviceType.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
            const services = servicesData.value.services || [];
            if (services.length > 0) {
                await prisma.serviceType.createMany({
                    data: services.map((s: any) => {
                        const isObj = typeof s === 'object' && s !== null;
                        const name = isObj ? (s.name || s.label || String(s)) : String(s);
                        const code = isObj ? (s.code || s.id || name.toLowerCase().replace(/\s+/g, '_')) : name.toLowerCase().replace(/\s+/g, '_');
                        return {
                            userId: user.id,
                            provider: 'flaship',
                            externalId: isObj ? String(s.id ?? code) : code,
                            name,
                            code,
                            description: isObj ? (s.desc || s.description || '') : '',
                            rawData: s,
                        };
                    }),
                });
            }
        }

        // ── Sync operational cities ────────────────────────────────────────────
        if (citiesData.status === 'fulfilled') {
            await prisma.operationalCity.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
            const cities = citiesData.value.cities || [];
            if (cities.length > 0) {
                await prisma.operationalCity.createMany({
                    data: cities.map((c: any, idx: number) => {
                        const isObj = typeof c === 'object' && c !== null;
                        const name = isObj ? (c.name || c.city || String(c)) : String(c);
                        const code = isObj ? (c.code || name.toLowerCase().replace(/\s+/g, '_')) : name.toLowerCase().replace(/\s+/g, '_');
                        return {
                            userId: user.id,
                            provider: 'flaship',
                            externalId: isObj ? String(c.id ?? code) : code,
                            name,
                            code,
                            zone: isObj ? (c.zone || null) : null,
                            isActive: isObj ? (c.active ?? true) : true,
                            rawData: c,
                        };
                    }),
                });
            }
        }

        // ── Sync rate cards ────────────────────────────────────────────────────
        if (ratesData.status === 'fulfilled') {
            await prisma.rateCard.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
            const rates = ratesData.value.rates || [];
            if (rates.length > 0) {
                await prisma.rateCard.createMany({
                    data: rates
                        .filter((r: any) => typeof r === 'object' && r !== null)
                        .map((r: any) => ({
                            userId: user.id,
                            provider: 'flaship',
                            externalId: r.id ? String(r.id) : null,
                            companyCode: r.company_code || r.company || null,
                            serviceType: r.service_type || r.type || null,
                            originZone: r.origin || null,
                            destinationZone: r.destination || null,
                            weightSlabMin: r.min_w != null ? Number(r.min_w) : null,
                            weightSlabMax: r.max_w != null ? Number(r.max_w) : null,
                            baseRate: r.base != null ? Number(r.base) : null,
                            perKgRate: r.extra != null ? Number(r.extra) : null,
                            codCharges: r.cod_fee != null ? Number(r.cod_fee) : null,
                            fuelSurcharge: r.fuel != null ? Number(r.fuel) : null,
                            rawData: r,
                        })),
                });
            }
        }

        // Create default courier settings if not existing
        await prisma.courierSettings.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, defaultProvider: 'flaship' },
        });

        await logActivity(user.id, 'connect', 'Connected to Flaship successfully', null, null, { accountName: accountData.businessName });

        return NextResponse.json({
            success: true,
            account: accountData,
            synced: {
                locations: locationsData.status === 'fulfilled',
                companies: companiesData.status === 'fulfilled',
                services: servicesData.status === 'fulfilled',
                cities: citiesData.status === 'fulfilled',
                rates: ratesData.status === 'fulfilled',
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Connection failed' }, { status: 500 });
    }
}
