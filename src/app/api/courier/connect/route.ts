import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { verifyAndFetchAccount } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';
import { syncCourierData } from '@/lib/sync-service';
import { apiError } from '@/lib/api-error';
import { rateLimit, Limit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const rl = rateLimit('connect', user.id, Limit.sensitive);
        if (!rl.success) {
            return NextResponse.json({ error: 'Too many connection attempts. Please wait before trying again.' }, { status: 429 });
        }

        const { apiKey } = await request.json();
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
        }

        // HTTP headers reject Latin-1 characters (code > 255).
        const cleanKey = apiKey.trim();
        if (/[^\x20-\x7E]/.test(cleanKey)) {
            return NextResponse.json({
                error: 'API key contains invalid characters (possibly a unicode arrow or emoji was pasted accidentally). Please copy the key directly from your Flaship dashboard and try again.',
            }, { status: 400 });
        }

        // Step 0: Check if already permanently connected
        const existing = await prisma.courierAccount.findFirst({
            where: { userId: user.id, provider: 'flaship', isActive: true },
            select: { id: true, connectedAt: true },
        });
        if (existing) {
            return NextResponse.json({
                error: 'A Flaship account is already permanently connected to this Blink N Ship account. For security, this connection cannot be changed or replaced. If you need to connect a different account, please contact support.',
            }, { status: 403 });
        }

        // Step 1: Ensure the user profile exists to prevent foreign key constraint violations
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

        // Create default courier settings if not existing
        await prisma.courierSettings.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, defaultProvider: 'flaship' },
        });

        // Trigger automatic database synchronization for master data.
        // On reconnect, the data is already in the DB — skip the expensive full sync.
        // Only run it on first-time connection (no companies in DB yet).
        let syncOutcome = { success: true, totalSynced: 0, totalSkipped: 0 };
        try {
            const existingCompanyCount = await prisma.courierCompany.count({
                where: { userId: user.id, provider: 'flaship' },
            });

            if (existingCompanyCount === 0) {
                // First-time connection: sync everything from Flaship
                syncOutcome = await syncCourierData(user.id, ['companies', 'pickup_locations', 'cities', 'rate_cards']);
            } else {
                // Reconnect: data already exists, skip the full sync to avoid delays
                log.info('COURIER', 'Sync skipped — data already exists (reconnect)');
            }
        } catch (syncErr: any) {
            log.error('COURIER', 'Auto-sync failed after connect', { error: String(syncErr) });
        }

        await logActivity(user.id, 'connect', `Connected to Flaship successfully. Sync: ${syncOutcome.totalSynced > 0 ? `${syncOutcome.totalSynced} records synced` : 'skipped (data already present)'}`, null, null, { accountName: accountData.businessName });


        return NextResponse.json({
            success: true,
            account: accountData,
            synced: {
                locations: syncOutcome.success,
                companies: syncOutcome.success,
                services: syncOutcome.success,
                cities: syncOutcome.success,
                rates: syncOutcome.success,
            },
        });
    } catch (err: any) {
        return apiError(err);
    }
}
