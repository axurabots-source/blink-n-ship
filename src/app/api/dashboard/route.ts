import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [
      totalOrders,
      bookedToday,
      profile,
      revenueAgg,
      profitAgg,
      todayBookedOrders,
      graphOrders,
      totalBooked,
      inTransit,
      delivered,
      returned,
      missingCostPrice,
    ] = await Promise.all([
      prisma.order.count({ where: { userId: user.id } }),
      prisma.order.count({
        where: {
          userId: user.id,
          status: "booked",
          bookedAt: { gte: startOfToday, lt: endOfToday },
        },
      }),
      prisma.profile.findUnique({ where: { id: user.id } }),
      prisma.order.aggregate({
        where: { userId: user.id, status: "booked" },
        _sum: { saleAmount: true },
      }),
      prisma.order.aggregate({
        where: { userId: user.id, status: "booked" },
        _sum: { profit: true },
      }),
      prisma.order.findMany({
        where: {
          userId: user.id,
          status: "booked",
          bookedAt: { gte: startOfToday, lt: endOfToday },
        },
        include: {
          product: true,
        },
        orderBy: { bookedAt: "desc" },
      }),
      prisma.order.findMany({
        where: {
          userId: user.id,
          status: "booked",
          bookedAt: { gte: fourteenDaysAgo },
        },
        select: {
          bookedAt: true,
          saleAmount: true,
          profit: true,
        },
      }),
      prisma.order.count({ where: { userId: user.id, status: "booked" } }),
      prisma.shipment.count({
        where: { userId: user.id, status: "in_transit" },
      }),
      prisma.shipment.count({
        where: { userId: user.id, status: "delivered" },
      }),
      prisma.shipment.count({ where: { userId: user.id, status: "returned" } }),
      prisma.order.count({
        where: { userId: user.id, status: "booked", costPrice: null },
      }),
    ]);

    const totalRevenue = Number(revenueAgg._sum.saleAmount ?? 0);
    const totalProfit = Number(profitAgg._sum.profit ?? 0);

    const dailyMap = new Map<
      string,
      { dateStr: string; profit: number; revenue: number }
    >();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
      });
      dailyMap.set(key, { dateStr: key, profit: 0, revenue: 0 });
    }

    for (const o of graphOrders) {
      if (!o.bookedAt) continue;
      const key = o.bookedAt.toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
      });
      const existing = dailyMap.get(key);
      if (existing) {
        existing.profit += Number(o.profit ?? 0);
        existing.revenue += Number(o.saleAmount ?? 0);
      }
    }
    const graphData = Array.from(dailyMap.values());

    const serialisedTodayOrders = todayBookedOrders.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      city: o.city,
      productName: o.product?.name ?? o.productInfo ?? "—",
      trackingNumber: o.trackingNumber,
      profit: o.profit ? Number(o.profit) : 0,
      costPrice: o.costPrice ? Number(o.costPrice) : null,
    }));

    return NextResponse.json({
      success: true,
      businessName: profile?.businessName ?? null,
      accountType: profile?.accountType ?? null,
      stats: {
        totalOrders,
        bookedToday,
        totalRevenue,
        totalProfit,
        totalBooked,
        inTransit,
        delivered,
        returned,
        missingCostPrice,
      },
      graphData,
      todayOrders: serialisedTodayOrders,
    });
  } catch (err: any) {
    return apiError(err);
  }
}
