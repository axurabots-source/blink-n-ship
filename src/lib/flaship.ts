import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = 'https://partners.flaship.pk/mr';
const TIMEOUT_MS = 20000;

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
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyAndFetchAccount(userId: string) {
    const { api_key } = await getCredentials(userId);
    const data = await apiRequest(api_key, '/company_list/', 'GET');
    // Return a structured account summary from the response
    const firstPickup = Array.isArray(data.pickupAddress) ? data.pickupAddress[0] : null;
    return {
        success: true,
        businessName: firstPickup?.shipperName || firstPickup?.name || 'Connected Account',
        phone: firstPickup?.shipperPhone || firstPickup?.phone || null,
        companiesCount: Array.isArray(data.companies) ? data.companies.length : 0,
        citiesCount: Array.isArray(data.operations_cities) ? data.operations_cities.length : 0,
        raw: data,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH ALL REFERENCE DATA (single call)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchAllReferenceData(userId: string) {
    const { api_key } = await getCredentials(userId);
    const data = await apiRequest(api_key, '/company_list/', 'GET');
    return {
        pickupAddresses: data.pickupAddress || [],
        companies: data.companies || [],
        rateCards: data.rateCards || data.rate_cards || [],
        cities: data.operations_cities || data.operationsCities || [],
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH PICKUP LOCATIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchPickupLocations(userId: string) {
    const { api_key } = await getCredentials(userId);
    const data = await apiRequest(api_key, '/company_list/', 'GET');
    return { locations: data.pickupAddress || [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH COURIER COMPANIES
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchCourierCompanies(userId: string) {
    const { api_key } = await getCredentials(userId);
    const data = await apiRequest(api_key, '/company_list/', 'GET');
    return { couriers: data.companies || [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH OPERATIONAL CITIES
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchOperationalCities(userId: string) {
    const { api_key } = await getCredentials(userId);
    const data = await apiRequest(api_key, '/company_list/', 'GET');
    return { cities: data.operations_cities || [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH RATE CARDS
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchRateCards(userId: string) {
    const { api_key } = await getCredentials(userId);
    const data = await apiRequest(api_key, '/api/rate-card/', 'GET');
    
    // Parse nested structure: { success: true, companies: [ { company_name: "Leopard", rate_cards: [...] } ] }
    const normalized: any[] = [];
    const companies = data.companies || [];
    
    for (const company of companies) {
        const compName = company.company_name || '';
        const cards = company.rate_cards || [];
        for (const card of cards) {
            normalized.push({
                company_code: compName,
                service_type: card.service_type,
                min_w: card.weight_from,
                max_w: card.weight_to,
                base: card.charges,
                extra: card.extra_charges_per_kg,
                cod_fee: card.other_charges || 0,
                fuel: 0,
            });
        }
    }
    
    return { rates: normalized };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH SERVICE TYPES (derived from companies list)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchServiceTypes(userId: string) {
    const { api_key } = await getCredentials(userId);
    const data = await apiRequest(api_key, '/company_list/', 'GET');
    const companies = data.companies || [];
    // Each company may have service_types or courierOptions array
    const services: any[] = [];
    for (const company of companies) {
        const opts = company.courierOptions || company.service_types || company.options || [];
        for (const opt of opts) {
            services.push({
                id: `${company.id || company.code}-${opt.code || opt.id}`,
                company_id: company.id || company.code,
                name: opt.name || opt.label || opt.code,
                code: opt.code || opt.id,
                desc: opt.description || '',
            });
        }
    }
    return { services };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOK SINGLE SHIPMENT
// POST /api/packet_booking
// ─────────────────────────────────────────────────────────────────────────────
export async function bookShipment(userId: string, orderData: {
    orderId: string;
    customerName: string;
    phoneNumber: string;
    address: string;
    city: string;
    weight: number;
    shippingType: string;        // overnight | overland | detain
    codAmount: number;
    pieces: number;
    courierCompany: string;      // company code e.g. "tcs"
    courierOption?: string;      // service option code
    pickupLocationId?: string;   // internal DB id
    pickupExternalId?: string;   // flaship pickup address id
    productName?: string;
}) {
    const { api_key } = await getCredentials(userId);

    const payload: Record<string, any> = {
        consigneeName: orderData.customerName,
        consigneePhone1: orderData.phoneNumber,
        consigneeAddress: orderData.address,
        destinationCity: orderData.city,
        codAmount: orderData.codAmount,
        productName: orderData.productName || 'Product',
        productWeight: orderData.weight,
        productPieces: orderData.pieces,
        courierCompany: orderData.courierCompany,
        courierOption: orderData.courierOption || orderData.shippingType,
    };

    if (orderData.pickupExternalId) {
        payload.pickuplocation = orderData.pickupExternalId;
    }

    const response = await apiRequest(api_key, '/api/packet_booking', 'POST', payload);

    return {
        success: response.success || true,
        orderNo: response.orderNo || response.order_no,
        trackingId: response.trackingId || response.tracking_id || response.cn,
        cn: response.trackingId || response.tracking_id || response.cn,
        labelUrl: response.labelUrl || response.label_url || null,
        courier_status: 'booked',
        raw: response,
    };
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
    const data = await apiRequest(api_key, `/api/order_tracking/${trackingNumber}/`, 'GET');
    return {
        success: data.status || true,
        trackingNumber,
        orderStatus: data.order_status || 'Unknown',
        tracking: data.tracking || [],
        raw: data,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL ORDER
// POST /api/cancel_order/  body: { cn: "FLP123456789" }
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelShipment(userId: string, trackingNumber: string) {
    const { api_key } = await getCredentials(userId);
    const data = await apiRequest(api_key, '/api/cancel_order/', 'POST', { cn: trackingNumber });
    return {
        success: data.success || true,
        message: data.message || 'Cancelled',
        raw: data,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE LOADSHEET
// POST /api/loadsheet/  body: { cns: ["FLP123"] }
// ─────────────────────────────────────────────────────────────────────────────
export async function generateLoadsheet(userId: string, trackingNumbers: string[]) {
    const { api_key } = await getCredentials(userId);
    const data = await apiRequest(api_key, '/api/loadsheet/', 'POST', { cns: trackingNumbers });
    return {
        success: data.success || true,
        loadsheetId: data.loadsheet_id || data.id,
        loadsheetUrl: data.loadsheet_url || data.url || null,
        orderCount: trackingNumbers.length,
        raw: data,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE LABEL
// POST /generate_label  body: { cns: ["FLP123"] }
// Returns PDF binary or URL
// ─────────────────────────────────────────────────────────────────────────────
export async function generateLabel(userId: string, trackingNumbers: string[]) {
    const { api_key } = await getCredentials(userId);
    const data = await apiRequest(api_key, '/generate_label', 'POST', { cns: trackingNumbers });

    if (data._binary) {
        // Binary PDF — caller must stream it
        return { _binary: true, data: data.data, contentType: data.contentType };
    }

    return {
        success: data.success || true,
        labelUrl: data.label_url || data.url || null,
        raw: data,
    };
}