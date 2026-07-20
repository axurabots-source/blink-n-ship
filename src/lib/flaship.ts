import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { log } from '@/lib/logger';
import {
    normalizeCompanyList,
    normalizeStatuses,
    normalizePickupLocationsList,
    normalizeRateCards,
    normalizeBooking,
    normalizeTracking,
    normalizeCancel,
    normalizeLoadsheet,
    normalizeLabel,
} from '@/lib/flaship-adapter';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.FLASHIP_BASE_URL ? `${process.env.FLASHIP_BASE_URL}/mr` : 'https://partners.flaship.pk/mr';
const TIMEOUT_MS = 60000;

// ─────────────────────────────────────────────────────────────────────────────
// CREDENTIAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function getCredentials(userId: string): Promise<{ api_key: string }> {
    const account = await prisma.courierAccount.findFirst({
        where: { userId, provider: 'flaship', isActive: true },
    });
    if (!account) throw new Error('No active Flaship connection. Please connect your account first.');

    let creds: { api_key: string };
    try {
        creds = JSON.parse(decrypt(account.encryptedCredentials));
    } catch {
        throw new Error('Stored credentials are corrupted. Please reconnect your Flaship account.');
    }

    // HTTP header values must be ByteStrings (Latin-1, code points 0-255).
    // Strip any unicode that crept in via copy-paste (e.g. → U+2192).
    creds.api_key = (creds.api_key || '').replace(/[^\x00-\xFF]/g, '').trim();
    if (!creds.api_key) {
        throw new Error('Stored API key is invalid or empty. Please reconnect your Flaship account.');
    }

    return creds;
}

/** Pre-fetch the decrypted API key once — use this in bulk-booking loops to
 *  avoid a redundant DB round-trip per order inside bookShipment. */
export async function getApiKey(userId: string): Promise<string> {
    const creds = await getCredentials(userId);
    return creds.api_key;
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL HTTP REQUEST WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
async function apiRequest(
    apiKey: string,
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, any>
): Promise<any> {
    const url = `${BASE_URL}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        clearTimeout(timeout);

        // Some endpoints return binary (label PDF) — handle that separately
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
            if (!res.ok) throw new Error(`Flaship API error ${res.status}`);
            const buffer = await res.arrayBuffer();
            return { _binary: true, data: Buffer.from(buffer), contentType };
        }

        let json: any;
        try {
            json = await res.json();
        } catch {
            throw new Error(`Flaship returned non-JSON response (status ${res.status})`);
        }

        if (!res.ok) {
            const msg = json?.detail || json?.message || json?.error || `HTTP ${res.status}`;
            throw new Error(`Flaship API error: ${msg}`);
        }

        return json;
    } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') throw new Error('Flaship API request timed out');
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY CONNECTION & FETCH COMPANY LIST
// GET /company_list/ → { pickupAddress[], companies[], rateCards{}, operations_cities[] }
// Note: pickupAddress only has {id, address} per Flaship docs (NOT shipperName/shipperPhone)
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyAndFetchAccount(userId: string, directApiKey?: string) {
    const api_key = directApiKey || (await getCredentials(userId)).api_key;
    const raw = await apiRequest(api_key, '/company_list/', 'GET');
    const normalized = normalizeCompanyList(raw);
    return {
        success: normalized.account.success,
        businessName: normalized.account.businessName,
        phone: normalized.account.phone,
        companiesCount: normalized.account.companiesCount,
        citiesCount: normalized.account.citiesCount,
        raw,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH ALL REFERENCE DATA (single call)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchAllReferenceData(userId: string) {
    const { api_key } = await getCredentials(userId);
    const raw = await apiRequest(api_key, '/company_list/', 'GET');
    const n = normalizeCompanyList(raw);
    return {
        pickupAddresses: n.pickupLocations,
        companies: n.companies,
        rateCards: n.rateCards,
        cities: n.cities,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH PICKUP LOCATIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchPickupLocations(userId: string) {
    const { api_key } = await getCredentials(userId);
    const raw = await apiRequest(api_key, '/api/pickup-locations/', 'GET');
    const locations = normalizePickupLocationsList(raw);
    return { locations };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH COURIER COMPANIES
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchCourierCompanies(userId: string) {
    const { api_key } = await getCredentials(userId);
    const raw = await apiRequest(api_key, '/company_list/', 'GET');
    const normalized = normalizeCompanyList(raw);
    const couriers = normalized.companies;
    log.info('COURIER', `fetchCourierCompanies → ${couriers.length} couriers`);
    return { couriers };
}

export async function fetchOperationalCities(userId: string) {
    const { api_key } = await getCredentials(userId);
    const raw = await apiRequest(api_key, '/company_list/', 'GET');
    const normalized = normalizeCompanyList(raw);
    log.info('COURIER', `fetchOperationalCities → ${normalized.cities.length} cities`);
    return { cities: normalized.cities };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH RATE CARDS
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchRateCards(userId: string) {
    const { api_key } = await getCredentials(userId);
    let raw: any;
    try {
        raw = await apiRequest(api_key, '/api/rate-card/', 'GET');
        log.info('COURIER', 'fetchRateCards response', { keys: Object.keys(raw || {}) });
    } catch (err: any) {
        log.warn('COURIER', 'fetchRateCards /api/rate-card/ failed, falling back to /company_list/', { error: err.message });
        raw = await apiRequest(api_key, '/company_list/', 'GET');
    }

    let normalized = normalizeRateCards(raw);

    // Fallback to basic default rate cards per company if API returned nothing.
    if (normalized.length === 0) {
        log.warn('COURIER', 'No rate cards found, generating defaults');
        const courierNames = ['tcs', 'daewoo', 'leopard', 'trax', 'mnp', 'tranzo', 'dex'];
        normalized = courierNames.flatMap((name) => [
            { id: `${name}-overnight`, company_code: name, service_type: 'overnight', min_w: 0, max_w: 1, base: 250, extra: 100, cod_fee: 0, fuel: 0, origin: 'All', destination: 'All' },
            { id: `${name}-overland`, company_code: name, service_type: 'overland', min_w: 0, max_w: 10, base: 500, extra: 50, cod_fee: 0, fuel: 0, origin: 'All', destination: 'All' },
        ]);
    }

    log.info('COURIER', `fetchRateCards → ${normalized.length} rates`);
    return { rates: normalized };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH SERVICE TYPES
// GET /api/statuses/ → { service_types: ["overnight","detain","overland"] }
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchServiceTypes(userId: string) {
    const { api_key } = await getCredentials(userId);
    const raw = await apiRequest(api_key, '/api/statuses/', 'GET');
    const normalized = normalizeStatuses(raw);
    return { services: normalized.serviceTypes };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOK SINGLE SHIPMENT
// POST /api/packet_booking
// ─────────────────────────────────────────────────────────────────────────────
// BOOKING — internal implementation (accepts pre-fetched API key)
// ─────────────────────────────────────────────────────────────────────────────
type BookOrderData = {
    orderId: string;
    customerName: string;
    phoneNumber: string;
    address: string;
    city: string;
    weight: number;
    shippingType: string;
    codAmount: number;
    pieces: number;
    courierCompany: string;
    courierOption?: string;
    pickupLocationId?: string;
    pickupExternalId?: string;
    productName?: string;
};

async function _bookWithKey(api_key: string, orderData: BookOrderData) {
    if (!orderData.pickupExternalId) {
        throw new Error(
            'Pickup location ID is required for booking. ' +
            'Please ensure you have a default pickup location set in your courier settings.'
        );
    }

    const payload: Record<string, any> = {
        consigneeName: String(orderData.customerName || ''),
        consigneePhone1: String(orderData.phoneNumber || ''),
        consigneeAddress: String(orderData.address || ''),
        destinationCity: String(orderData.city || ''),
        codAmount: String(orderData.codAmount || 0),
        productName: String(orderData.productName || 'Product'),
        productWeight: String(orderData.weight || 0.5),
        productPieces: String(orderData.pieces || 1),
        courierCompany: String(orderData.courierCompany || ''),
        courierOption: String(orderData.courierOption || orderData.shippingType || 'overnight').toLowerCase(),
        pickuplocation: String(orderData.pickupExternalId || ''),
    };

    log.info('FLASHIP', 'Booking payload', { orderId: orderData.orderId, payload });

    const response = await apiRequest(api_key, '/api/packet_booking', 'POST', payload);
    log.info('FLASHIP', 'Booking raw response', { orderId: orderData.orderId, response });

    const n = normalizeBooking(response);

    // Bug #2 fix: Flaship often returns HTTP 200 with { success: false, message: "..." }
    // Treat any explicit success:false as a booking failure regardless of HTTP status.
    if (n.success === false) {
        const msg = response?.message || response?.error || response?.detail || 'Flaship booking failed.';
        log.error('FLASHIP', 'Booking rejected by Flaship (success:false)', { response });
        throw new Error(msg);
    }

    if (!n.trackingId && !n.cn) {
        const msg = response?.message || response?.error || response?.detail || 'Flaship API returned no tracking number/CN.';
        log.error('FLASHIP', 'Booking missing CN/trackingId', { response });
        throw new Error(msg);
    }

    return {
        success: n.success,
        orderNo: n.orderNo,
        trackingId: n.trackingId,
        cn: n.cn,
        labelUrl: n.labelUrl,
        courier_status: n.courier_status,
        raw: response,
    };
}

/** Standard booking — fetches credentials from DB automatically. */
export async function bookShipment(userId: string, orderData: BookOrderData) {
    const { api_key } = await getCredentials(userId);
    return _bookWithKey(api_key, orderData);
}

/** Fast booking for bulk loops — accepts a pre-fetched API key so the
 *  credential DB query is only done ONCE per request, not per order. */
export async function bookShipmentWithKey(api_key: string, orderData: BookOrderData) {
    return _bookWithKey(api_key, orderData);
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK BOOKING
// ─────────────────────────────────────────────────────────────────────────────
export async function bulkBookShipments(userId: string, orders: any[]) {
    const results = [];
    for (const order of orders) {
        try {
            const res = await bookShipment(userId, order);
            results.push({ orderId: order.orderId, success: true, data: res });
        } catch (err: any) {
            results.push({ orderId: order.orderId, success: false, error: err.message });
        }
    }
    return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACK ORDER
// GET /api/order_tracking/{tracking_number}/
// ─────────────────────────────────────────────────────────────────────────────
export async function getTrackingStatus(userId: string, trackingNumber: string) {
    const { api_key } = await getCredentials(userId);
    const raw = await apiRequest(api_key, `/api/order_tracking/${trackingNumber}/`, 'GET');
    const n = normalizeTracking(raw);
    return {
        success: n.success,
        trackingNumber,
        orderStatus: n.orderStatus,
        tracking: n.tracking,
        raw,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL ORDER
// POST /api/cancel_order/  body: { cn: "FLP123456789" }
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelShipment(userId: string, trackingNumber: string) {
    const { api_key } = await getCredentials(userId);
    const raw = await apiRequest(api_key, '/api/cancel_order/', 'POST', { cn: trackingNumber });
    const n = normalizeCancel(raw);
    return { success: n.success, message: n.message, raw };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADSHEET ELIGIBLE ORDERS
// GET /api/loadsheet/eligible-orders/
// Returns booked orders that do NOT yet have a loadsheet — these are the only
// CNs that /api/loadsheet/ will accept.
// ─────────────────────────────────────────────────────────────────────────────
export async function getEligibleLoadsheetOrders(userId: string): Promise<string[]> {
    const { api_key } = await getCredentials(userId);
    const raw = await apiRequest(api_key, '/api/loadsheet/eligible-orders/', 'GET');
    const orders: any[] = Array.isArray(raw?.orders) ? raw.orders : [];
    // Extract tracking_number from each eligible order
    return orders
        .map((o: any) => o.tracking_number || o.cn || o.trackingNumber)
        .filter(Boolean) as string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE LOADSHEET
// POST /api/loadsheet/  body: { cns: ["FLP123"] }
// ─────────────────────────────────────────────────────────────────────────────
export async function generateLoadsheet(userId: string, trackingNumbers: string[]) {
    const { api_key } = await getCredentials(userId);
    const raw = await apiRequest(api_key, '/api/loadsheet/', 'POST', { cns: trackingNumbers });
    const n = normalizeLoadsheet(raw);
    return {
        success: n.success,
        loadsheetId: n.loadsheetId,
        loadsheetUrl: n.loadsheetUrl,
        orderCount: trackingNumbers.length,
        generatedCount: n.generatedCount,
        raw,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE LABEL
// POST /generate_label  body: { cns: ["FLP123"] }
// Returns PDF binary or URL
// ─────────────────────────────────────────────────────────────────────────────
export async function generateLabel(userId: string, trackingNumbers: string[]) {
    const { api_key } = await getCredentials(userId);
    const raw = await apiRequest(api_key, '/generate_label', 'POST', { cns: trackingNumbers });
    const n = normalizeLabel(raw);
    if (n._binary) {
        return { _binary: true, data: n.data, contentType: n.contentType };
    }
    return { _binary: false, labelUrl: n.labelUrl, raw };
}