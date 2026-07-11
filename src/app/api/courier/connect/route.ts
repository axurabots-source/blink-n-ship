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

        // Step 0: Check existences in parallel to save DB roundtrips
        const [existingAccount, existingMeta] = await Promise.all([
            prisma.courierAccount.findFirst({
                where: { userId: user.id, provider: 'flaship' },
                select: { id: true, isActive: true },
            }),
            prisma.courierAccountMetadata.findFirst({
                where: { userId: user.id, provider: 'flaship' },
                select: { id: true },
            })
        ]);

        if (existingAccount?.isActive) {
            return NextResponse.json({
                error: 'A Flaship account is already permanently connected to this Blink N Ship account. For security, this connection cannot be changed or replaced. If you need to connect a different account, please contact support.',
            }, { status: 403 });
        }

        // Step 1: Verify key directly via Flaship API before database changes
        const accountData = await verifyAndFetchAccount(user.id, cleanKey);

        const encryptedCredentials = encrypt(JSON.stringify({ api_key: cleanKey }));
        const accountId = existingAccount?.id ?? '00000000-0000-0000-0000-000000000000';
        const metaId = existingMeta?.id ?? '00000000-0000-0000-0000-000000000000';

        // Step 2: Execute all database writes in parallel
        await Promise.all([
            prisma.profile.upsert({
                where: { id: user.id },
                update: { flashipConnected: true },
                create: {
                    id: user.id,
                    businessName: user.user_metadata?.business_name || 'My Business',
                    accountType: user.user_metadata?.account_type || 'reseller',
                    flashipConnected: true,
                },
            }),
            prisma.courierAccount.upsert({
                where: { id: accountId },
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
            }),
            prisma.courierAccountMetadata.upsert({
                where: { id: metaId },
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
            }),
            prisma.courierSettings.upsert({
                where: { userId: user.id },
                update: {},
                create: { userId: user.id, defaultProvider: 'flaship' },
            }),
            logActivity(user.id, 'connect', 'Connected to Flaship successfully. Reference data sync started in background.', null, null, { accountName: accountData.businessName }),
        ]);

        // Trigger automatic database synchronization in the background.
        prisma.courierCompany.count({
            where: { userId: user.id, provider: 'flaship' },
        }).then((existingCompanyCount) => {
            if (existingCompanyCount === 0) {
                log.info('COURIER', `Starting background auto-sync for user ${user.id}`);
                syncCourierData(user.id, ['companies', 'pickup_locations', 'cities', 'rate_cards'])
                    .then((syncOutcome) => {
                        log.info('COURIER', `Background auto-sync completed for user ${user.id}`, { success: syncOutcome.success });
                    })
                    .catch((syncErr) => {
                        log.error('COURIER', `Background auto-sync job failed for user ${user.id}`, { error: String(syncErr) });
                    });
            } else {
                log.info('COURIER', `Sync skipped — data already exists (reconnect) for user ${user.id}`);
            }
        }).catch((err) => {
            log.error('COURIER', `Background count check failed for user ${user.id}`, { error: String(err) });
        });

        return NextResponse.json({
            success: true,
            account: accountData,
            synced: {
                locations: true,
                companies: true,
                services: true,
                cities: true,
                rates: true,
            },
        });
    } catch (err: any) {
        return apiError(err);
    }
}
