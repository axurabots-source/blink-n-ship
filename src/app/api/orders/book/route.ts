import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { bookShipmentWithKey, getApiKey, cancelShipment, fetchPickupLocations } from "@/lib/flaship";
import { validatePickupLocations } from "@/lib/flaship-adapter";
import { validatePhone, normalizeCityName } from "@/lib/validation";
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
      orderShippingCosts,
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

    // ── Parallel pre-fetch: pickup location + orders + companies + cities + API key ──
    // Running all 5 DB queries simultaneously saves ~3-4s of sequential round-trips.
    const [
      pickupRow,
      orders,
      companyRecords,
      allCities,
      apiKey,
    ] = await Promise.all([
      // 1. Pickup location (prefer default, fallback to first available)
      pickupLocationId
        ? prisma.pickupLocation.findFirst({ where: { id: pickupLocationId, userId: user.id } })
        : prisma.pickupLocation.findFirst({
            where: { userId: user.id, provider: 'flaship' },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          }),

      // 2. Selected draft orders
      prisma.order.findMany({
        where: { id: { in: order_ids }, userId: user.id, status: 'draft' },
        include: { product: true, items: true },
      }),

      // 3. Courier companies
      prisma.courierCompany.findMany({ where: { userId: user.id, provider: 'flaship' } }),

      // 4. ALL operational cities for this user (in-memory lookup replaces per-order DB query)
      prisma.operationalCity.findMany({
        where: { userId: user.id },
        select: { name: true },
      }),

      // 5. Decrypted API key — fetched once, reused for every order
      getApiKey(user.id),
    ]);

    // Build a lower-cased city set for O(1) lookups
    const validCitySet = new Set(allCities.map((c: { name: string }) => c.name.toLowerCase().trim()));

    // Auto-heal pickup location if still missing after parallel fetch
    let resolvedPickup = pickupRow;
    let pickupExternalId: string | undefined = resolvedPickup?.externalId || undefined;

    if (!pickupExternalId) {
      log.warn('ORDERS/BOOK', 'No Flaship pickup in DB — auto-heal re-sync', { userId: user.id });
      try {
        const data = await fetchPickupLocations(user.id);
        const { valid } = validatePickupLocations(data.locations || []);
        if (valid.length > 0) {
          await prisma.$transaction(async (tx) => {
            await tx.pickupLocation.deleteMany({ where: { userId: user.id, provider: 'flaship' } });
            await tx.pickupLocation.createMany({
              data: valid.map((l: any, i: number) => ({
                userId: user.id, provider: 'flaship', externalId: l.id,
                name: l.name, contactPerson: l.contact_person, phone: l.phone,
                address: l.address, city: l.city, area: l.area,
                isDefault: l.is_default ?? (i === 0), rawData: l,
              })),
            });
          });
          resolvedPickup = await prisma.pickupLocation.findFirst({
            where: { userId: user.id, provider: 'flaship' },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          });
          pickupExternalId = resolvedPickup?.externalId || undefined;
          log.info('ORDERS/BOOK', `Auto-heal synced ${valid.length} pickup locations`, { userId: user.id });
        }
      } catch (healErr: any) {
        log.error('ORDERS/BOOK', 'Auto-heal re-sync failed', { error: healErr.message });
      }
    }

    if (orders.length === 0) {
      return NextResponse.json({ error: 'No valid draft orders found' }, { status: 404 });
    }

    const results = [];

    for (const order of orders) {
      try {
        const selectedCode = (orderCouriers && orderCouriers[order.id]) || courierCompany;
        if (!selectedCode) throw new Error('Please select a courier company for this order.');

        // Normalize city name based on target courier option (e.g., leopards)
        const rawCityName = order.city || '';
        const companyRecord = companyRecords.find(
          (c: { code: string | null; name: string }) =>
            c.code?.toLowerCase() === selectedCode.toLowerCase() ||
            c.name?.toLowerCase() === selectedCode.toLowerCase(),
        );
        const realCompanyName = companyRecord?.name || selectedCode;
        const targetCity = normalizeCityName(rawCityName, realCompanyName);

        // Field validation
        if (!order.customerName?.trim()) throw new Error('Consignee Name is required.');
        if (!order.phoneNumber?.trim()) throw new Error('Consignee Phone number is required.');
        if (!order.address?.trim()) throw new Error('Consignee Address is required.');
        if (!targetCity.trim()) throw new Error('Destination City is required.');
        if (!order.weight || parseFloat(String(order.weight)) <= 0) throw new Error('Valid weight is required.');
        if (!order.sellingPrice || parseFloat(String(order.sellingPrice)) < 0) throw new Error('Valid COD amount is required.');

        // In-memory city check (O(1), no DB query per order)
        if (!validCitySet.has(targetCity.toLowerCase().trim())) {
          throw new Error(`The city "${targetCity}" (original: "${rawCityName}") is not an operational Flaship city for your connected merchant account.`);
        }

        if (!pickupExternalId) {
          throw new Error('No valid pickup location selected or set as default.');
        }

        // Book using pre-fetched API key — no extra DB call per order
        const result = await bookShipmentWithKey(apiKey, {
          orderId: order.id,
          customerName: order.customerName || "",
          phoneNumber: validatePhone(order.phoneNumber),
          address: order.address || "",
          city: targetCity,
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
              description: `Booked via ${realCompanyName}`,
              source: "system",
              occurredAt: new Date(),
            },
          });

          // Calculate net profit: saleAmount - costPrice - shippingCost
          // Fall back to summing order items if order-level totals are null
          let saleAmt = order.saleAmount != null ? Number(order.saleAmount) : null;
          let costAmt = order.costPrice != null ? Number(order.costPrice) : null;
          if (saleAmt == null || costAmt == null) {
            const items = order.items || [];
            if (saleAmt == null) {
              saleAmt = items.reduce((s, i) => s + Number(i.saleAmount || 0) * i.quantity, 0) || null;
            }
            if (costAmt == null) {
              costAmt = items.reduce((s, i) => s + Number(i.costPrice || 0) * i.quantity, 0) || null;
            }
          }
          const shipCost = orderShippingCosts?.[order.id] ?? 0;
          const netProfit =
            saleAmt != null && costAmt != null
              ? saleAmt - costAmt - Number(shipCost)
              : null;

          const bookUpdates: Record<string, any> = {
            status: "booked",
            trackingNumber: result.trackingId,
            labelUrl: result.labelUrl,
            courierProvider: realCompanyName,
            courierStatus: "booked",
            shipmentId: shipment.id,
            bookedAt: new Date(),
            profit: netProfit,
          };
          if (saleAmt != null && order.saleAmount == null) bookUpdates.saleAmount = saleAmt;
          if (costAmt != null && order.costPrice == null) bookUpdates.costPrice = costAmt;

          await tx.order.update({
            where: { id: order.id },
            data: bookUpdates,
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

        // Reset order atomically
        await prisma.$transaction(async (tx) => {
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
