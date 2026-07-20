/**
 * Flaship Adapter — Centralized Response Normalization Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Per the Courier Module Stability Update (Point 2):
 *   "Do NOT allow individual routes to map Flaship responses independently.
 *    Create a centralized Flaship Adapter / Mapper layer."
 *
 * Every Flaship API response flows through this module before reaching Prisma.
 * No raw API response is ever inserted into the database.
 *
 * Responsibilities:
 *   • Response normalization (consistent Prisma-compatible objects)
 *   • Type conversion (strings → Number/Decimal, ISO strings → Date, etc.)
 *   • Field fallbacks (id|externalId|external_id, name|shipperName|contact_person, ...)
 *   • Validation (skip invalid records, log reason, continue)
 *   • Idempotent upsert-friendly output
 *
 * This module is PURE — no HTTP, no Prisma. It only transforms data.
 * HTTP + persistence live in flaship.ts and the route handlers.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES — what every consumer (route) receives
// ─────────────────────────────────────────────────────────────────────────────

export interface NormalizedCompany {
    id: string;
    name: string;
    code: string;
    active: boolean;
    is_default: boolean;
}

export interface NormalizedPickupLocation {
    id: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    area: string | null;
    is_default: boolean;
}

export interface NormalizedCity {
    id: string;
    name: string;
    code: string;
    zone: string | null;
    zones: string[];
    active: boolean;
}

export interface NormalizedRateCard {
    id: string;
    company_code: string;
    service_type: string;
    min_w: number;
    max_w: number;
    base: number;
    extra: number;
    cod_fee: number;
    fuel: number;
    origin: string | null;
    destination: string | null;
}

export interface NormalizedServiceType {
    id: string;
    name: string;
    code: string;
    description: string;
}

export interface NormalizedAccount {
    success: boolean;
    businessName: string;
    phone: string | null;
    companiesCount: number;
    citiesCount: number;
}

export interface NormalizedBooking {
    success: boolean;
    orderNo: string | null;
    trackingId: string | null;
    cn: string | null;
    labelUrl: string | null;
    courier_status: string;
}

export interface NormalizedTrackingEvent {
    status: string;
    time: Date | null;
    description: string | null;
    location: string | null;
    raw: unknown;
}

export interface NormalizedTracking {
    success: boolean;
    orderStatus: string;
    tracking: NormalizedTrackingEvent[];
}

export interface NormalizedCancel {
    success: boolean;
    message: string;
}

export interface NormalizedLoadsheet {
    success: boolean;
    loadsheetId: string | number | null;
    loadsheetUrl: string | null;
    generatedCount: number | null;
    skippedOrders: unknown[];
}

export interface NormalizedLabel {
    _binary: boolean;
    data?: Buffer;
    contentType?: string;
    labelUrl: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Pick the first defined, non-null value from a list of candidate field names. */
function pick(obj: any, keys: string[]): any {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    return undefined;
}

/** Coerce to a number, defaulting to fallback when missing/invalid. */
function toNumber(v: any, fallback = 0): number {
    if (v === undefined || v === null || v === '') return fallback;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
}

/** Coerce to a boolean, treating common truthy/falsy strings sensibly. */
function toBool(v: any, fallback = false): boolean {
    if (v === undefined || v === null) return fallback;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    const s = String(v).toLowerCase().trim();
    if (['true', '1', 'yes', 'active'].includes(s)) return true;
    if (['false', '0', 'no', 'inactive'].includes(s)) return false;
    return fallback;
}

/** Coerce to a trimmed string, defaulting to fallback. */
function toStr(v: any, fallback: string | null = null): string | null {
    if (v === undefined || v === null) return fallback;
    return String(v).trim() || fallback;
}

/** Strip common suffixes from a courier-zone key. e.g. "Leopard_all" → "Leopard". */
function parseZoneFromKey(key: string): string {
    return String(key || '').replace(/_all$|_overland$|_overnight$|_detain$/i, '').trim();
}

/** Generate a stable code from a name. */
function nameToCode(name: string): string {
    return String(name || '').toLowerCase().replace(/\s+/g, '_').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER: /company_list/
// Docs response:
//   { pickupAddress: [{id, address}], companies: ["TCS","Leopard",...],
//     rateCards: {...}, operatioons_cities: { "Leopard_all": ["Lahore",...] } }
// Note the typo'd key "operatioons_cities" — handled here, never leaked out.
// ─────────────────────────────────────────────────────────────────────────────

export interface CompanyListNormalized {
    account: NormalizedAccount;
    companies: NormalizedCompany[];
    pickupLocations: NormalizedPickupLocation[];
    cities: NormalizedCity[];
    rateCards: NormalizedRateCard[];
    raw: unknown;
}

export function normalizeCompanyList(raw: any): CompanyListNormalized {
    const data = raw || {};

    // pickupAddress — only {id, address} per docs; name/contact fallbacks feed the pickup-location model
    const pickupAddressesRaw: any[] = Array.isArray(data.pickupAddress) ? data.pickupAddress : [];

    const pickupLocations: NormalizedPickupLocation[] = pickupAddressesRaw.map((p, i) => {
        const address = toStr(pick(p, ['address', 'pickup_address', 'pickupAddress']));
        const name =
            toStr(pick(p, ['name', 'shipperName', 'shipper_name', 'contact_person', 'address'])) ||
            `Pickup ${i + 1}`;
        return {
            id: String(pick(p, ['id', 'pickup_id', 'pickupId']) ?? `pickup-${i + 1}`),
            name: name || address || `Pickup ${i + 1}`,
            contact_person: toStr(pick(p, ['contact_person', 'shipperName', 'shipper_name'])),
            phone: toStr(pick(p, ['phone', 'shipperPhone', 'shipper_phone', 'contact_phone'])),
            address,
            city: toStr(pick(p, ['city'])),
            area: toStr(pick(p, ['area', 'region'])),
            is_default: toBool(pick(p, ['is_default', 'isDefault', 'default']), i === 0),
        };
    });

    // companies — flat string array per docs; also tolerate object entries
    const companiesRaw: any[] = Array.isArray(data.companies) ? data.companies : [];
    const companies: NormalizedCompany[] = companiesRaw.map((c, i) => {
        if (typeof c === 'string') {
            const name = c.trim();
            const code = nameToCode(name);
            return { id: code || `company-${i + 1}`, name, code, active: true, is_default: i === 0 };
        }
        const name = toStr(pick(c, ['name', 'company_name', 'label'])) || `Company ${i + 1}`;
        const code = toStr(pick(c, ['code', 'id', 'company_id'])) || nameToCode(name);
        return {
            id: String(code),
            name,
            code,
            active: toBool(pick(c, ['active', 'is_active', 'isActive']), true),
            is_default: toBool(pick(c, ['is_default', 'isDefault', 'default']), i === 0),
        };
    });

    // cities — under typo'd key "operatioons_cities" (double-o). Resilient to alternatives.
    // Structure is { "Leopard_all": ["Lahore", ...], "MNP_all": [...] } — prefix encodes the zone.
    const opCitiesObj =
        data.operatioons_cities ?? data.operations_cities ?? data.operationalCities ?? data.operational_cities ?? {};

    const cityZoneMap = new Map<string, Set<string>>();

    if (Array.isArray(opCitiesObj)) {
        // Flat array form (no zone info)
        for (const city of opCitiesObj) {
            const name = typeof city === 'string' ? city.trim() : toStr(pick(city, ['name', 'city_name']));
            if (name && !cityZoneMap.has(name)) cityZoneMap.set(name, new Set());
        }
    } else if (opCitiesObj && typeof opCitiesObj === 'object') {
        for (const key of Object.keys(opCitiesObj)) {
            const zone = parseZoneFromKey(key);
            const list = opCitiesObj[key];
            if (Array.isArray(list)) {
                for (const city of list) {
                    const name = typeof city === 'string' ? city.trim() : toStr(pick(city, ['name', 'city_name']));
                    if (!name) continue;
                    if (!cityZoneMap.has(name)) cityZoneMap.set(name, new Set());
                    cityZoneMap.get(name)!.add(zone);
                }
            }
        }
    }

    const cities: NormalizedCity[] = Array.from(cityZoneMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, zones], i) => {
            const sortedZones = Array.from(zones).sort();
            return {
                id: String(i + 1),
                name,
                code: nameToCode(name),
                zone: sortedZones[0] || null,
                zones: sortedZones,
                active: true,
            };
        });

    // rate cards — present in /company_list/ response; full normalization reused below.
    const rateCards = normalizeRateCardsFromCompanyList(data);

    const account: NormalizedAccount = {
        success: true,
        // /company_list/ does NOT return a merchant name per docs — never read shipperName from pickupAddress.
        businessName: 'Connected Account',
        phone: null,
        companiesCount: companies.length,
        citiesCount: cities.length,
    };

    return { account, companies, pickupLocations, cities, rateCards, raw: data };
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER: /api/rate-card/
// Docs: { success, companies: [{ company_name, rate_cards: [{ service_type, charges, weight_from, weight_to }] }] }
// Also handles a flat "rate_cards"/"rateCards"/"rates" array form as a fallback.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeRateCardObject(card: any, companyName: string): NormalizedRateCard | null {
    if (!card || typeof card !== 'object') return null;
    const compName = toStr(companyName) || toStr(pick(card, ['company_code', 'company', 'courier'])) || 'flaship';
    const serviceType = toStr(pick(card, ['service_type', 'serviceType'])) || 'overnight';
    return {
        id: toStr(pick(card, ['id'])) || `${nameToCode(compName)}-${serviceType}`,
        company_code: nameToCode(compName),
        service_type: serviceType,
        min_w: toNumber(pick(card, ['weight_from', 'min_w', 'weightSlabMin'])),
        max_w: toNumber(pick(card, ['weight_to', 'max_w', 'weightSlabMax']), 0.5),
        base: toNumber(pick(card, ['charges', 'base_rate', 'baseRate', 'base'])),
        extra: toNumber(pick(card, ['extra_charges_per_kg', 'per_kg_rate', 'perKgRate', 'extra'])),
        cod_fee: toNumber(pick(card, ['other_charges', 'cod_charges', 'codCharges', 'cod_fee'])),
        fuel: toNumber(pick(card, ['fuel_surcharge', 'fuelSurcharge', 'fuel'])),
        origin: toStr(pick(card, ['origin', 'origin_zone', 'originZone'])),
        destination: toStr(pick(card, ['destination', 'destination_zone', 'destinationZone'])),
    };
}

/** Normalize rate cards when sourced from a dedicated /api/rate-card/ response. */
export function normalizeRateCards(raw: any): NormalizedRateCard[] {
    const data = raw || {};
    const out: NormalizedRateCard[] = [];

    const companies = data.companies || data.couriers || [];
    if (Array.isArray(companies) && companies.length && typeof companies[0] === 'object') {
        for (const company of companies) {
            const compName =
                toStr(pick(company, ['company_name', 'name', 'code'])) || 'flaship';
            const cards = company.rate_cards || company.rateCards || company.rates || [];
            if (Array.isArray(cards)) {
                for (const card of cards) {
                    const n = normalizeRateCardObject(card, compName);
                    if (n) out.push(n);
                }
            }
        }
    }

    if (out.length === 0) {
        const direct = data.rateCards || data.rate_cards || data.rates || [];
        if (Array.isArray(direct)) {
            for (const card of direct) {
                const n = normalizeRateCardObject(card, '');
                if (n) out.push(n);
            }
        }
    }

    return out;
}

/** Normalize rate cards embedded inside a /company_list/ response (rateCards field). */
export function normalizeRateCardsFromCompanyList(companyListData: any): NormalizedRateCard[] {
    const data = companyListData || {};
    const embedded = data.rateCards || data.rate_cards;
    if (Array.isArray(embedded)) return normalizeRateCards({ rate_cards: embedded });
    // /company_list/ ships rate cards keyed by company under a `rateCards` object too
    if (embedded && typeof embedded === 'object') {
        const flat: any[] = [];
        for (const companyName of Object.keys(embedded)) {
            const cards = embedded[companyName];
            if (Array.isArray(cards)) {
                for (const serviceType of cards) {
                    flat.push({ company_code: companyName, service_type: serviceType, charges: 0 });
                }
            }
        }
        return flat
            .map((c) => normalizeRateCardObject(c, toStr(c.company_code) || ''))
            .filter((x): x is NormalizedRateCard => x !== null);
    }
    return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER: /api/statuses/
// Docs: { success, order_statuses: { all: [...] }, service_types: [...] }
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusesNormalized {
    serviceTypes: NormalizedServiceType[];
    orderStatuses: string[];
}

export function normalizeStatuses(raw: any): StatusesNormalized {
    const data = raw || {};
    const sts: string[] = data.service_types || [];
    const allStatuses: string[] = data.order_statuses?.all || data.order_statuses || [];

    return {
        serviceTypes: sts.map((t) => {
            const code = String(t);
            return { id: code, name: code, code, description: '' };
        }),
        orderStatuses: allStatuses.map((s) => String(s)),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER: /api/pickup-locations/
// Docs: { success, pickup_locations: [{id, address, is_default}], user_companies: [] }
// ─────────────────────────────────────────────────────────────────────────────

export function normalizePickupLocationsList(raw: any): NormalizedPickupLocation[] {
    const data = raw || {};
    const list: any[] = data.pickup_locations || data.pickupAddresses || data.pickupAddress || [];
    return list.map((p, i) => {
        // Flaship returns {id, address, is_default} — address IS the display name for most accounts
        const address = toStr(pick(p, ['address', 'pickup_address']));
        const name =
            toStr(pick(p, ['name', 'shipperName', 'shipper_name', 'contact_person'])) ||
            address ||
            `Pickup ${i + 1}`;
        return {
            id: String(pick(p, ['id', 'pickup_id']) ?? `pickup-${i + 1}`),
            name,
            contact_person: toStr(pick(p, ['contact_person', 'shipperName', 'shipper_name'])),
            phone: toStr(pick(p, ['phone', 'shipperPhone', 'shipper_phone', 'contact_phone'])),
            address,
            city: toStr(pick(p, ['city'])),
            area: toStr(pick(p, ['area', 'region'])),
            is_default: toBool(pick(p, ['is_default', 'isDefault', 'default']), i === 0),
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER: /api/packet_booking/ (POST)
// Docs: { success, orderNo, trackingId }
// Expected request validation is done in flaship.ts (provider-specific concerns).
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeBooking(raw: any): NormalizedBooking {
    const data = raw || {};
    const trackingId = toStr(pick(data, ['trackingId', 'tracking_id', 'cn']));
    const orderNoRaw = pick(data, ['orderNo', 'order_no', 'orderNumber']);
    const orderNo = orderNoRaw === undefined || orderNoRaw === null ? null : String(orderNoRaw);
    return {
        success: toBool(pick(data, ['success']), true),
        orderNo,
        trackingId,
        cn: trackingId,
        labelUrl: toStr(pick(data, ['labelUrl', 'label_url'])),
        courier_status: 'booked',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER: /api/order_tracking/{cn}/ (GET)
// Docs: { status: true, tracking: [{ status, time }], order_status: "In Transit" }
// NOTE: timeline entries use the `time` field — NOT occurred_at / occurredAt.
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeTracking(raw: any): NormalizedTracking {
    const data = raw || {};
    const rawEvents: any[] = data.tracking || [];

    const tracking: NormalizedTrackingEvent[] = rawEvents.map((h) => {
        const timeRaw = pick(h, ['time', 'occurred_at', 'occurredAt', 'timestamp']);
        let time: Date | null = null;
        if (timeRaw) {
            const d = new Date(timeRaw);
            time = Number.isNaN(d.getTime()) ? null : d;
        }
        return {
            status: toStr(pick(h, ['status', 'state'])) || 'Unknown',
            time,
            description: toStr(pick(h, ['description', 'note', 'status'])),
            location: toStr(pick(h, ['location', 'city', 'city_name'])),
            raw: h,
        };
    });

    return {
        success: toBool(pick(data, ['status']), true),
        orderStatus: toStr(pick(data, ['order_status', 'orderStatus'])) || 'Unknown',
        tracking,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER: /api/cancel_order/ (POST)
// Docs: { status: true/false, message: "..." } — uses `status`, NOT `success`.
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeCancel(raw: any): NormalizedCancel {
    const data = raw || {};
    const ok = pick(data, ['status', 'success']);
    // Flaship uses `status` (boolean). If only `success` is present, fall back to it.
    const success = ok !== undefined ? toBool(ok) : true;
    return {
        success,
        message: toStr(pick(data, ['message', 'msg'])) || (success ? 'Cancelled' : 'Failed'),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER: /api/loadsheet/ (POST)
// Docs: { success, url, loadsheet_id, generated_count, skipped_orders }
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeLoadsheet(raw: any): NormalizedLoadsheet {
    const data = raw || {};
    return {
        success: toBool(pick(data, ['success']), true),
        loadsheetId: pick(data, ['loadsheet_id', 'id', 'loadsheetId']) ?? null,
        loadsheetUrl: toStr(pick(data, ['url', 'loadsheet_url', 'loadsheetUrl'])),
        generatedCount: pick(data, ['generated_count', 'generatedCount']) ?? null,
        skippedOrders: Array.isArray(data.skipped_orders) ? data.skipped_orders : [],
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZER: /generate_label (POST)
// Docs: returns binary PDF (Content-Type: application/pdf) OR { success:false, reason }
// `apiRequest` in flaship.ts already extracts a binary wrapper { _binary, data, contentType };
// here we just shape the JSON-failure path consistently.
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeLabel(raw: any): NormalizedLabel {
    // Binary path — passed through by flaship.ts as { _binary: true, data, contentType }
    if (raw && raw._binary) {
        return { _binary: true, data: raw.data, contentType: raw.contentType, labelUrl: null };
    }
    const data = raw || {};
    return {
        _binary: false,
        labelUrl: toStr(pick(data, ['label_url', 'url', 'labelUrl'])),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-RECORD VALIDATION (Point 5)
//   "If a record is invalid: skip only that record, log the reason, continue."
// Returns a ValidationOutcome; invalid records are filtered out by the caller.
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationOutcome<T> {
    valid: T[];
    skipped: { record: unknown; reason: string }[];
}

export function validateCompanies(records: NormalizedCompany[]): ValidationOutcome<NormalizedCompany> {
    const valid: NormalizedCompany[] = [];
    const skipped: { record: unknown; reason: string }[] = [];
    for (const c of records) {
        if (!c.name) { skipped.push({ record: c, reason: 'Missing company name' }); continue; }
        valid.push(c);
    }
    return { valid, skipped };
}

export function validateCities(records: NormalizedCity[]): ValidationOutcome<NormalizedCity> {
    const valid: NormalizedCity[] = [];
    const skipped: { record: unknown; reason: string }[] = [];
    for (const c of records) {
        if (!c.name) { skipped.push({ record: c, reason: 'Missing city name' }); continue; }
        valid.push(c);
    }
    return { valid, skipped };
}

export function validatePickupLocations(records: NormalizedPickupLocation[]): ValidationOutcome<NormalizedPickupLocation> {
    const valid: NormalizedPickupLocation[] = [];
    const skipped: { record: unknown; reason: string }[] = [];
    for (const l of records) {
        // Only the external id is truly required — it is what Flaship's packet_booking
        // API needs in the `pickuplocation` field. Name and address are display-only.
        // Flaship often returns {id, address, is_default} with no separate name field.
        if (!l.id || l.id.startsWith('pickup-')) {
            skipped.push({ record: l, reason: 'Missing pickup location id from Flaship' });
            continue;
        }
        valid.push(l);
    }
    return { valid, skipped };
}

export function validateRateCards(records: NormalizedRateCard[]): ValidationOutcome<NormalizedRateCard> {
    const valid: NormalizedRateCard[] = [];
    const skipped: { record: unknown; reason: string }[] = [];
    for (const r of records) {
        if (!r.company_code) { skipped.push({ record: r, reason: 'Missing company_code' }); continue; }
        if (!r.service_type) { skipped.push({ record: r, reason: 'Missing service_type' }); continue; }
        valid.push(r);
    }
    return { valid, skipped };
}
