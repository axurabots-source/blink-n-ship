import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fetchOperationalCities } from '@/lib/flaship';
import { apiError } from '@/lib/api-error';
import { log } from '@/lib/logger';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        let cities = await prisma.operationalCity.findMany({
            where: { userId: user.id },
            orderBy: { name: 'asc' },
        });

        // Auto-fetch if DB is empty
        if (cities.length === 0) {
            try {
                const data = await fetchOperationalCities(user.id);
                const fetchedCities = data.cities || [];
                if (fetchedCities.length > 0) {
                    await prisma.operationalCity.createMany({
                        data: fetchedCities.map((c: any) => ({
                            userId: user.id,
                            provider: 'flaship',
                            externalId: c.id,
                            name: c.name,
                            code: c.code,
                            zone: c.zone,
                            isActive: c.active ?? true,
                            rawData: c,
                        })),
                    });
                    cities = await prisma.operationalCity.findMany({
                        where: { userId: user.id },
                        orderBy: { name: 'asc' },
                    });
                }
    } catch (err: any) {
        log.error('COURIER', 'Auto-sync cities failed', { error: String(err) });
    }
        }

        return NextResponse.json({ cities });
    } catch (err: any) {
        return apiError(err);
    }
}

// POST /api/courier/cities
// Manually trigger a refresh/sync of operational cities from the Flaship API
export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const data = await fetchOperationalCities(user.id);
        const fetchedCities = data.cities || [];

        if (fetchedCities.length > 0) {
            await prisma.$transaction(async (tx) => {
                // Delete existing records to sync freshly
                await tx.operationalCity.deleteMany({
                    where: { userId: user.id }
                });

                await tx.operationalCity.createMany({
                    data: fetchedCities.map((c: any) => ({
                        userId: user.id,
                        provider: 'flaship',
                        externalId: c.id,
                        name: c.name,
                        code: c.code,
                        zone: c.zone,
                        isActive: c.active ?? true,
                        rawData: c,
                    })),
                });
            });
        }

        const cities = await prisma.operationalCity.findMany({
            where: { userId: user.id },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ success: true, count: cities.length, cities });
    } catch (err: any) {
        return apiError(err);
    }
}

