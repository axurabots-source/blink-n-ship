import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { verifyAndFetchAccount } from '@/lib/flaship';
import { logActivity } from '@/lib/courierHelpers';
import { syncCourierData } from '@/lib/sync-service';

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

        // Create default courier settings if not existing
        await prisma.courierSettings.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, defaultProvider: 'flaship' },
        });

        // Trigger automatic database synchronization for master data
        let syncOutcome = { success: false, totalSynced: 0, totalSkipped: 0 };
        try {
            syncOutcome = await syncCourierData(user.id, ['companies', 'pickup_locations', 'cities', 'rate_cards']);
        } catch (syncErr: any) {
            console.error('[Connect Sync] Auto-sync failed:', syncErr.message);
        }

        await logActivity(user.id, 'connect', `Connected to Flaship successfully and auto-synced data (${syncOutcome.totalSynced} records synced)`, null, null, { accountName: accountData.businessName });

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
        return NextResponse.json({ error: err.message || 'Connection failed' }, { status: 500 });
    }
}
