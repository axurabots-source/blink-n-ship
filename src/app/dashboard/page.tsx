import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const now = new Date();
    // Start and end of today in local date context
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [
        totalOrders,
        bookedToday,
        profile,
        revenueAgg,
        profitAgg,
        todayBookedOrders,
    ] = await Promise.all([
        prisma.order.count({ where: { userId: user.id } }),
        prisma.order.count({
            where: {
                userId: user.id,
                status: 'booked',
                bookedAt: { gte: startOfToday, lt: endOfToday },
            },
        }),
        prisma.profile.findUnique({ where: { id: user.id } }),
        prisma.order.aggregate({
            where: { userId: user.id, status: 'booked' },
            _sum: { sellingPrice: true },
        }),
        prisma.order.aggregate({
            where: { userId: user.id, status: 'booked' },
            _sum: { profit: true },
        }),
        prisma.order.findMany({
            where: {
                userId: user.id,
                status: 'booked',
                bookedAt: { gte: startOfToday, lt: endOfToday },
            },
            include: {
                product: true,
            },
            orderBy: { bookedAt: 'desc' },
        }),
    ]);

    const totalRevenue = Number(revenueAgg._sum.sellingPrice ?? 0);
    const totalProfit = Number(profitAgg._sum.profit ?? 0);

    // Calculate last 14 days profit & revenue
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const graphOrders = await prisma.order.findMany({
        where: {
            userId: user.id,
            status: 'booked',
            bookedAt: { gte: fourteenDaysAgo },
        },
        select: {
            bookedAt: true,
            sellingPrice: true,
            profit: true,
        },
    });

    const dailyMap = new Map<string, { dateStr: string; profit: number; revenue: number }>();
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
        dailyMap.set(key, { dateStr: key, profit: 0, revenue: 0 });
    }

    for (const o of graphOrders) {
        if (!o.bookedAt) continue;
        const key = o.bookedAt.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
        const existing = dailyMap.get(key);
        if (existing) {
            existing.profit += Number(o.profit ?? 0);
            existing.revenue += Number(o.sellingPrice ?? 0);
        }
    }
    const graphData = Array.from(dailyMap.values());

    const serialisedTodayOrders = todayBookedOrders.map((o) => ({
        id: o.id,
        customerName: o.customerName,
        city: o.city,
        productName: o.product?.name ?? o.productInfo ?? '—',
        trackingNumber: o.trackingNumber,
        profit: o.profit ? Number(o.profit) : 0,
    }));

    return (
        <DashboardClient
            businessName={profile?.businessName ?? null}
            accountType={profile?.accountType ?? null}
            stats={{
                totalOrders,
                bookedToday,
                totalRevenue,
                totalProfit,
            }}
            graphData={graphData}
            todayOrders={serialisedTodayOrders}
        />
    );
}