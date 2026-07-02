import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { fetchCourierCompanies } from '@/lib/flaship';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        let companies = await prisma.courierCompany.findMany({
            where: { userId: user.id },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });

        // Auto-sync if DB is empty — same pattern as operational cities
        if (companies.length === 0) {
            try {
                const data = await fetchCourierCompanies(user.id);
                const fetched = data.couriers || [];
                if (fetched.length > 0) {
                    await prisma.courierCompany.createMany({
                        data: fetched.map((c: any) => ({
                            userId: user.id,
                            provider: 'flaship',
                            externalId: c.id,
                            name: c.name,
                            code: c.code,
                            isActive: c.active ?? true,
                            isDefault: c.is_default ?? false,
                            rawData: c,
                        })),
                    });
                    companies = await prisma.courierCompany.findMany({
                        where: { userId: user.id },
                        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
                    });
                }
            } catch (err: any) {
                console.error('Auto-sync courier companies failed:', err.message);
            }
        }

        return NextResponse.json({ companies });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/courier/companies — Force re-sync from Flaship and return updated list
export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const data = await fetchCourierCompanies(user.id);
        const fetched = data.couriers || [];

        if (fetched.length > 0) {
            await prisma.courierCompany.deleteMany({ where: { userId: user.id } });
            await prisma.courierCompany.createMany({
                data: fetched.map((c: any) => ({
                    userId: user.id,
                    provider: 'flaship',
                    externalId: c.id,
                    name: c.name,
                    code: c.code,
                    isActive: c.active ?? true,
                    isDefault: c.is_default ?? false,
                    rawData: c,
                })),
            });
        }

        const companies = await prisma.courierCompany.findMany({
            where: { userId: user.id },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });

        return NextResponse.json({ success: true, count: companies.length, companies });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

