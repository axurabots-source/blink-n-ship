import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { bookShipment, cancelShipment } from "@/lib/flaship";
import { validatePhone } from "@/lib/validation";
import { apiError } from "@/lib/api-error";
import { rateLimit, Limit } from "@/lib/rate-limit";
import { checkIdempotency, makeIdempotencyKey } from "@/lib/idempotency";
import { log } from "@/lib/logger";

// POST /api/orders/book
// Body: { order_ids: string[], courierCompany: string, courierOption: string, pickupLocationId?: string }
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const rl = rateLimit("booking", user.id, Limit.booking);
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "Too many booking requests. Please wait before trying again.",
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const {
      order_ids,
      courierCompany,
      courierOption,
      pickupLocationId,
      orderCouriers,
    } = body;

    if (!checkIdempotency(makeIdempotencyKey(user.id, "book", body))) {
      return NextResponse.json(
        { error: "Duplicate booking request detected." },
        { status: 409 },
      );
    }

    if (!order_ids?.length) {
      return NextResponse.json(
        { error: "No orders selected" },
        { status: 400 },
      );
    }

    // Resolve pickup location external ID if provided
    let pickupExternalId: string | undefined;
    if (pickupLocationId) {
      const pickup = await prisma.pickupLocation.findFirst({
        where: { id: pickupLocationId, userId: user.id },
      });
      pickupExternalId = pickup?.externalId || undefined;
    } else {
      // Use default pickup location
      const defaultPickup = await prisma.pickupLocation.findFirst({
        where: { userId: user.id, isDefault: true },
      });
      pickupExternalId = defaultPickup?.externalId || undefined;
    }

    // Fetch the selected orders
    const orders = await prisma.order.findMany({
      where: {
        id: { in: order_ids },
        userId: user.id,
        status: "draft",
      },
      include: { product: true },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "No valid draft orders found" },
        { status: 404 },
      );
    }

    // Pre-fetch all courier companies for this user to match codes/names
    const companyRecords = await prisma.courierCompany.findMany({
      where: { userId: user.id, provider: "flaship" },
    });

    const results = [];

    for (const order of orders) {
      try {
        // Find selected courier for this specific order
        const selectedCode =
          (orderCouriers && orderCouriers[order.id]) || courierCompany;
        if (!selectedCode) {
          throw new Error("Please select a courier company for this order.");
        }

        // Strict Backend Field Validation
        if (!order.customerName?.trim())
          throw new Error("Consignee Name is required.");
        if (!order.phoneNumber?.trim())
          throw new Error("Consignee Phone number is required.");
        if (!order.address?.trim())
          throw new Error("Consignee Address is required.");
        if (!order.city?.trim())
          throw new Error("Destination City is required.");
        if (!order.weight || parseFloat(String(order.weight)) <= 0)
          throw new Error("Valid weight is required.");
        if (!order.sellingPrice || parseFloat(String(order.sellingPrice)) < 0)
          throw new Error("Valid COD amount is required.");

        // Verify the city exists in operational cities for this specific user to avoid booking invalid cities
        const destCity = await prisma.operationalCity.findFirst({
          where: {
            userId: user.id,
            name: { equals: order.city.trim(), mode: "insensitive" },
          },
        });
        if (!destCity) {
          throw new Error(
            `The city "${order.city}" is not an operational Flaship city for your connected merchant account.`,
          );
        }

        // Verify pickup location external ID exists if expected
        if (!pickupExternalId) {
          throw new Error(
            "No valid pickup location selected or set as default.",
          );
        }

        const companyRecord = companyRecords.find(
          (c) =>
            c.code?.toLowerCase() === selectedCode.toLowerCase() ||
            c.name?.toLowerCase() === selectedCode.toLowerCase(),
        );
        const realCompanyName = companyRecord?.name || selectedCode;

        // Call real Flaship booking API
        const result = await bookShipment(user.id, {
          orderId: order.id,
          customerName: order.customerName || "",
          phoneNumber: validatePhone(order.phoneNumber),
          address: order.address || "",
          city: order.city || "",
          weight: Number(order.weight || order.product?.weight || 0.5),
          shippingType: order.shippingType || courierOption || "overnight",
          codAmount: Number(order.sellingPrice || 0),
          pieces: order.quantity || 1,
          courierCompany: realCompanyName,
          courierOption: courierOption || order.shippingType || "overnight",
          pickupExternalId,
          productName: order.product?.name || order.productInfo || "Product",
        });

        // Persist all booking DB writes atomically
        const bookingTx = await prisma.$transaction(async (tx) => {
          const shipment = await tx.shipment.upsert({
            where: { orderId: order.id },
            update: {
              userId: user.id,
              provider: "flaship",
              pickupLocationId: pickupLocationId || undefined,
              trackingNumber: result.trackingId,
              cn: result.cn,
              externalId: String(result.orderNo || ""),
              labelUrl: result.labelUrl,
              status: "booked",
              courierStatus: "booked",
              serviceType: courierOption || order.shippingType || "overnight",
              weight: Number(order.weight || order.product?.weight || 0.5),
              pieces: order.quantity || 1,
              codAmount: Number(order.sellingPrice || 0),
              recipientName: order.customerName,
              recipientPhone: validatePhone(order.phoneNumber),
              recipientAddress: order.address,
              recipientCity: order.city,
              bookedAt: new Date(),
              bookingRequest: {
                courierCompany,
                courierOption,
                pickupExternalId,
              },
              bookingResponse: result.raw,
            },
            create: {
              userId: user.id,
              orderId: order.id,
              provider: "flaship",
              pickupLocationId: pickupLocationId || undefined,
              trackingNumber: result.trackingId,
              cn: result.cn,
              externalId: String(result.orderNo || ""),
              labelUrl: result.labelUrl,
              status: "booked",
              courierStatus: "booked",
              serviceType: courierOption || order.shippingType || "overnight",
              weight: Number(order.weight || order.product?.weight || 0.5),
              pieces: order.quantity || 1,
              codAmount: Number(order.sellingPrice || 0),
              recipientName: order.customerName,
              recipientPhone: validatePhone(order.phoneNumber),
              recipientAddress: order.address,
              recipientCity: order.city,
              bookedAt: new Date(),
              bookingRequest: {
                courierCompany,
                courierOption,
                pickupExternalId,
              },
              bookingResponse: result.raw,
            },
          });

          await tx.shipmentTimeline.create({
            data: {
              shipmentId: shipment.id,
              status: "booked",
              description: `Booked via ${courierCompany}`,
              source: "system",
              occurredAt: new Date(),
            },
          });

          if (order.productId) {
            const product = await tx.product.findUnique({
              where: { id: order.productId },
              select: { stockQuantity: true },
            });
            if (
              !product ||
              Number(product.stockQuantity) < (order.quantity || 1)
            ) {
              throw new Error(
                `Insufficient stock for product "${order.productInfo || order.product?.name || "unknown"}". Available: ${product?.stockQuantity ?? 0}, requested: ${order.quantity || 1}`,
              );
            }
            await tx.product.update({
              where: { id: order.productId },
              data: { stockQuantity: { decrement: order.quantity } },
            });
          }

          // Deduct stock for order items
          for (const item of await tx.orderItem.findMany({
            where: { orderId: order.id },
          })) {
            if (item.productId) {
              const prod = await tx.product.findUnique({
                where: { id: item.productId },
                select: { stockQuantity: true },
              });
              if (!prod || Number(prod.stockQuantity) < (item.quantity || 1)) {
                throw new Error(
                  `Insufficient stock for "${item.productName || "product"}". Available: ${prod?.stockQuantity ?? 0}, requested: ${item.quantity || 1}`,
                );
              }
              await tx.product.update({
                where: { id: item.productId },
                data: { stockQuantity: { decrement: item.quantity } },
              });
            }
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "booked",
              trackingNumber: result.trackingId,
              labelUrl: result.labelUrl,
              courierProvider: realCompanyName,
              courierStatus: "booked",
              shipmentId: shipment.id,
              bookedAt: new Date(),
            },
          });

          return shipment;
        });

        results.push({
          id: order.id,
          success: true,
          trackingNumber: result.trackingId,
          shipmentId: bookingTx.id,
        });
      } catch (err: any) {
        results.push({ id: order.id, success: false, error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return apiError(err);
  }
}

// PATCH /api/orders/book
// Body: { order_ids: string[] }  → bulk unbook/cancel
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const rl = rateLimit("booking", user.id, Limit.booking);
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "Too many booking requests. Please wait before trying again.",
        },
        { status: 429 },
      );
    }

    const { order_ids } = await request.json();
    if (!order_ids?.length)
      return NextResponse.json(
        { error: "No orders provided" },
        { status: 400 },
      );

    const results = [];

    for (const orderId of order_ids) {
      try {
        const order = await prisma.order.findFirst({
          where: { id: orderId, userId: user.id, status: "booked" },
        });
        if (!order) {
          results.push({
            id: orderId,
            success: false,
            error: "Order not found or not booked",
          });
          continue;
        }

        // Cancel with Flaship if tracking number exists
        if (order.trackingNumber) {
          try {
            await cancelShipment(user.id, order.trackingNumber);
          } catch (cancelErr: any) {
            // Log but don't block the unbook — courier may have already processed
            log.warn("COURIER", "Flaship cancel warning", {
              trackingNumber: order.trackingNumber,
              error: cancelErr.message,
            });
          }
        }

        // Restore stock and reset order atomically
        await prisma.$transaction(async (tx) => {
          if (order.productId) {
            await tx.product.update({
              where: { id: order.productId },
              data: { stockQuantity: { increment: order.quantity } },
            });
          }

          // Restore stock for order items
          for (const item of await tx.orderItem.findMany({
            where: { orderId },
          })) {
            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stockQuantity: { increment: item.quantity } },
              });
            }
          }

          await tx.order.update({
            where: { id: orderId },
            data: {
              status: "draft",
              trackingNumber: null,
              labelUrl: null,
              courierProvider: null,
              courierStatus: null,
              shipmentId: null,
              bookedAt: null,
            },
          });
        });

        results.push({ id: orderId, success: true });
      } catch (err: any) {
        results.push({ id: orderId, success: false, error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return apiError(err);
  }
}
