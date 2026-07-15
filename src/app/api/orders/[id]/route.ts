import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { cancelShipment } from "@/lib/flaship";
import { apiError } from "@/lib/api-error";
import { log } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const allowed = [
      "customerName",
      "phoneNumber",
      "address",
      "city",
      "productInfo",
      "quantity",
      "productId",
      "costPrice",
      "saleAmount",
      "sellingPrice",
      "shippingType",
      "weight",
      "status",
    ];

    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const existing = await prisma.order.findUnique({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Profit recalculation using saleAmount - costPrice (only for drafts)
    if (existing.status === 'draft' && ("saleAmount" in updates || "costPrice" in updates)) {
      const sale =
        updates.saleAmount !== undefined
          ? updates.saleAmount
          : existing.saleAmount;
      const cost =
        updates.costPrice !== undefined
          ? updates.costPrice
          : existing.costPrice;
      if (sale != null && cost != null) {
        updates.profit = Number(sale) - Number(cost);
      } else {
        updates.profit = null;
      }
    }

    let order;

    // Handle orderItems array from body — recalculate parent totals
    const orderItemsBody = body.orderItems;
    if (orderItemsBody && Array.isArray(orderItemsBody)) {
      let totalCost = 0;
      let totalSale = 0;
      let totalWeight = 0;
      let hasCost = false;
      let hasSale = false;
      let allInventory = orderItemsBody.length > 0;
      await prisma.$transaction(async (tx) => {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        for (const item of orderItemsBody) {
          if (!item.productId && !item.productName) continue;
          if (!item.productId) allInventory = false;
          const cost = item.costPrice ? Number(item.costPrice) : null;
          const sale = item.saleAmount ? Number(item.saleAmount) : null;
          const qty = item.quantity || 1;
          const itemProfit =
            cost != null && sale != null ? Number(sale) - Number(cost) : null;
          if (cost) { totalCost += cost * qty; hasCost = true; }
          if (sale) { totalSale += sale * qty; hasSale = true; }
          await tx.orderItem.create({
            data: {
              orderId: id,
              productId: item.productId || null,
              productName: item.productName || null,
              quantity: qty,
              costPrice: cost,
              saleAmount: sale,
              profit: itemProfit,
            },
          });
        }
        // Look up weights for inventory products
        if (allInventory) {
          const invItems = orderItemsBody.filter((i: any) => i.productId && i.productId !== '__no_inventory__');
          if (invItems.length > 0) {
            const prodIds = [...new Set(invItems.map((i: any) => i.productId))];
            const invProducts = await tx.product.findMany({
              where: { id: { in: prodIds } },
              select: { id: true, weight: true },
            });
            const weightMap = new Map(invProducts.map((p) => [p.id, parseFloat(String(p.weight ?? '0')) || 0]));
            for (const item of invItems) {
              const w = weightMap.get(item.productId) || 0;
              totalWeight += w * (item.quantity || 1);
            }
          }
        }
        // Update parent order totals
        const parentUpdates: Record<string, any> = {};
        if (hasSale) parentUpdates.saleAmount = totalSale;
        if (hasCost) parentUpdates.costPrice = totalCost;
        if (hasSale && hasCost) {
          parentUpdates.profit = totalSale - totalCost;
        } else if (hasSale || hasCost) {
          parentUpdates.profit = null;
        }
        if (totalWeight > 0) parentUpdates.weight = totalWeight;
        if (Object.keys(parentUpdates).length > 0) {
          await tx.order.update({ where: { id }, data: parentUpdates });
        }
      });
    }

    // Unbooking handler: status change from booked -> draft
    if (updates.status === "draft" && existing.status === "booked") {
      // Verify shipment is not in a terminal state
      if (existing.shipmentId) {
        const shipment = await prisma.shipment.findUnique({
          where: { id: existing.shipmentId },
          select: { status: true },
        });
        const terminalStates = ["delivered", "returned", "cancelled", "failed"];
        if (shipment && terminalStates.includes(shipment.status)) {
          return NextResponse.json(
            { error: `Cannot unbook — shipment already ${shipment.status}` },
            { status: 400 },
          );
        }
      }
      if (existing.trackingNumber) {
        try {
          await cancelShipment(user.id, existing.trackingNumber);
        } catch (cancelErr: any) {
          log.warn("COURIER", "Flaship cancel warning", {
            trackingNumber: existing.trackingNumber,
            error: cancelErr.message,
          });
        }
      }
      updates.trackingNumber = null;
      updates.labelUrl = null;
      updates.courierProvider = null;
      updates.courierStatus = null;
      updates.shipmentId = null;
      updates.bookedAt = null;

      order = await prisma.$transaction(async (tx) => {
        return tx.order.update({
          where: { id, userId: user.id },
          data: updates,
        });
      });
    } else {
      order = await prisma.order.update({
        where: { id, userId: user.id },
        data: updates,
      });
    }

    return NextResponse.json(order);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.order.findUnique({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Cancel with courier before deleting if booked
    if (existing.status === "booked" && existing.trackingNumber) {
      try {
        await cancelShipment(user.id, existing.trackingNumber);
      } catch (cancelErr: any) {
        log.warn("COURIER", "Flaship cancel warning during delete", {
          trackingNumber: existing.trackingNumber,
          error: cancelErr.message,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.delete({
        where: { id, userId: user.id },
      });
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
