# Performance & Request Audit — Per-Page Breakdown

## /orders (src/app/orders/page.tsx)

### On mount (4 requests, parallel batch)
| Request | Role | Why | Est. time |
|---------|------|-----|-----------|
| GET /api/orders | 🔴 Critical | Draft + booked order list — page is empty without this | 200-500ms |
| GET /api/products | 🔴 Critical | Inventory for product selector dropdown | 50-150ms |
| GET /api/courier/cities | 🔴 Critical | City autocomplete dropdown — user cannot fill city without it | 100-500ms |
| GET /api/courier/companies | 🔴 Critical | Courier selector dropdown | 100-300ms |

### After orders load (N sequential requests, 300ms gap each)
| Request | Role | Why | Est. time |
|---------|------|-----|-----------|
| GET /api/courier/rate-estimate?weight=&city= | 🟡 Deferrable | Per-draft shipping cost — cosmetic, appears after form fill | 200-500ms each |
| *(fires once per draft order that has weight + city)* | | | |

### On user interaction
| Request | Role | When | Est. time |
|---------|------|------|-----------|
| POST /api/orders/extract | 🔵 Mutation | "Process Orders" button clicked | 2-10s (AI) |
| POST /api/orders/book | 🔵 Mutation | "Book Now" button clicked | 500-2000ms |
| PATCH /api/orders/{id} | 🔵 Mutation | Field onBlur (auto-save) | 50-150ms |
| DELETE /api/orders/{id} | 🔵 Mutation | Delete draft clicked | 50-150ms |
| POST /api/courier/cities | 🔵 Mutation | "Sync Cities" button | 500-2000ms |
| POST /api/courier/companies | 🔵 Mutation | "Sync Companies" button | 500-2000ms |
| POST /api/courier/track | 🔵 Mutation | Track sync clicked | 200-500ms |

### ⚠ Issues
- 4 critical requests fire in parallel — all needed for first paint
- Rate-estimate fires N sequential requests (1 per 300ms) — already throttled
- Every field blur fires PATCH — debounced auto-save added
- CourierLock duplicates GET /api/courier/account (see below)

---

## /courier/bookings (src/app/courier/bookings/page.tsx)

### On mount (1 request)
| Request | Role | Why | Est. time |
|---------|------|-----|-----------|
| GET /api/courier/bookings?page=&search=&status= | 🔴 Critical | Paginated shipment list — page is empty without this | 200-500ms |

### On user interaction
| Request | Role | When |
|---------|------|------|
| GET /api/courier/bookings?page=&search=&status= | 🔵 Mutation | Pagination / filter change |

### ⚠ Issues
- Single request, no parallelism issues

---

## /courier (src/app/courier/page.tsx — Dashboard)

### On mount (2 parallel requests)
| Request | Role | Why | Est. time |
|---------|------|-----|-----------|
| GET /api/courier/dashboard | 🔴 Critical | Dashboard stats cards | 200-500ms |
| GET /api/courier/dashboard/stats | 🔴 Critical | Charts data | 300-800ms |

### ⚠ Issues
- Polling interval for auto-refresh (check if clearInterval exists on unmount)

---

## /courier/shipments (src/app/courier/shipments/page.tsx)

### On mount (1 request)
| Request | Role | Why | Est. time |
|---------|------|-----|-----------|
| GET /api/orders | 🔴 Critical | Filtered shipment list | 200-500ms |

### ⚠ Issues
- Same endpoint as /orders but with different filters — could share cache

---

## /courier/sync-center (src/app/courier/sync-center/page.tsx)

### On mount (1 request)
| Request | Role | Why | Est. time |
|---------|------|-----|-----------|
| GET /api/courier/sync/status | 🟡 Deferrable | Sync status — page has static content | 200-500ms |

### ⚠ Issues
- Should be deferrable (non-blocking) since page has static UI to show first

---

## /dashboard (src/app/dashboard/page.tsx)

### On mount (1 request)
| Request | Role | Why | Est. time |
|---------|------|-----|-----------|
| GET /api/dashboard | 🔴 Critical | Main dashboard stats | 200-500ms |

---

## /settings (src/app/settings/page.tsx)

### On mount (N parallel requests depending on tab)
| Request | Role | Why | Est. time |
|---------|------|-----|-----------|
| GET /api/settings/profile | 🔴 Critical | Profile data | 100-200ms |
| GET /api/settings/activity-logs | 🟡 Deferrable | Activity log | 200-500ms |
| GET /api/settings/notifications | 🟡 Deferrable | Notification prefs | 100-200ms |
| GET /api/settings/auth-context | 🔴 Critical | Auth providers list | 100-200ms |
| GET /api/settings/team | 🟡 Deferrable | Team members | 200-500ms |
| GET /api/settings/security/sessions | 🟡 Deferrable | Active sessions | 100-200ms |

### ⚠ Issues
- All fire on mount regardless of which tab is active
- Tab-specific data could be lazy-loaded only when tab is selected

---

## /tracking (src/app/tracking/page.tsx)

### On user interaction
| Request | Role | When |
|---------|------|------|
| GET /api/tracking?trackingNumber= | 🔵 Mutation | User enters tracking number and hits search |

---

## /ledger (src/app/ledger/page.tsx)

### On mount (1 request)
| Request | Role | Why |
|---------|------|-----|
| GET /api/ledger | 🔴 Critical | Profit & loss data |

---

## Every courier/* page — CourierLock component

### On mount of ANY courier page (1 request, DUPLICATED)
| Request | Role | Why | Est. time |
|---------|------|-----|-----------|
| GET /api/courier/account | 🔴 Critical | Verify Flaship is connected — blocks entire page | 200-500ms |

### ⚠ Issues
- **DUPLICATED**: The layout.tsx calls `isFlashipConnected()` (server-side Prisma query) AND CourierLock.tsx calls `GET /api/courier/account` (client-side fetch). Same data fetched twice on every courier page.

---

## Cross-Cutting Issues Summary

| # | Issue | Pages Affected | Impact |
|---|-------|----------------|--------|
| 1 | GET /api/courier/account fires twice | All courier/* pages | 2x unnecessary requests |
| 2 | All settings APIs fire on mount | /settings | Tab-specific data loaded unnecessarily |
| 3 | Rate estimates fire per-draft on load | /orders | N sequential requests (mitigated with 300ms throttle) |
| 4 | No HTTP caching on any endpoint | All pages | Every mount re-fetches everything |
| 5 | Polling may lack cleanup on unmount | /courier/dashboard, /tracking | Potential memory leaks |
