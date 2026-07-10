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

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [orders, profile] = await Promise.all([
      prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          userId: true,
          productId: true,
          customerName: true,
          phoneNumber: true,
          address: true,
          city: true,
          productInfo: true,
          quantity: true,
          costPrice: true,
          saleAmount: true,
          sellingPrice: true,
          profit: true,
          status: true,
          trackingNumber: true,
          labelUrl: true,
          courierProvider: true,
          courierStatus: true,
          shipmentId: true,
          weight: true,
          shippingType: true,
          createdAt: true,
          bookedAt: true,
          deliveredAt: true,
          returnedAt: true,
          items: {
            select: {
              id: true,
              productId: true,
              productName: true,
              quantity: true,
              costPrice: true,
              saleAmount: true,
              profit: true,
            },
          },
        },
      }),
      prisma.profile.findUnique({
        where: { id: user.id },
      }),
    ]);

    return NextResponse.json({ orders, profile });
  } catch (err) {
    return apiError(err);
  }
}
