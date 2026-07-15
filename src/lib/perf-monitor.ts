"use client";

// ─── Per‑page request taxonomy ──────────────────────────────────────────────
// "critical"  = page cannot render meaningful content without this request
// "deferrable"= can arrive after first paint without harming UX
// "mutation"  = user‑triggered write (POST / PATCH / DELETE)

type RequestProfile = {
  url: string;
  page: string;
  role: "critical" | "deferrable" | "mutation";
  note: string;
};

const PROFILES: RequestProfile[] = [
  // ── Orders (booking) ──────────────────────────────────────────────────
  { url: "/api/orders",              page: "/orders",           role: "critical",   note: "draft + booked order list" },
  { url: "/api/products",            page: "/orders",           role: "critical",   note: "inventory for product selector" },
  { url: "/api/courier/cities",      page: "/orders",           role: "critical",   note: "city autocomplete dropdown" },
  { url: "/api/courier/companies",   page: "/orders",           role: "critical",   note: "courier selector dropdown" },
  { url: "/api/courier/rate-estimate", page: "/orders",         role: "deferrable", note: "per‑draft shipping cost" },
  { url: "/api/orders/extract",      page: "/orders",           role: "mutation",   note: "AI order extraction" },
  { url: "/api/orders/book",         page: "/orders",           role: "mutation",   note: "bulk book / unbook" },
  { url: "/api/orders/",             page: "/orders",           role: "mutation",   note: "PATCH / DELETE single order" },

  // ── Courier bookings ──────────────────────────────────────────────────
  { url: "/api/courier/bookings",    page: "/courier/bookings", role: "critical",   note: "paginated booked shipments" },

  // ── Courier dashboard ─────────────────────────────────────────────────
  { url: "/api/courier/dashboard",   page: "/courier",         role: "critical",   note: "dashboard overview" },

  // ── Courier shipments ─────────────────────────────────────────────────
  { url: "/api/orders",              page: "/courier/shipments", role: "critical",   note: "shipped orders list (filtered)" },

  // ── Courier sync center ───────────────────────────────────────────────
  { url: "/api/courier/sync/status", page: "/courier/sync-center", role: "deferrable", note: "sync status polling" },

  // ── Dashboard ─────────────────────────────────────────────────────────
  { url: "/api/dashboard",           page: "/dashboard",        role: "critical",   note: "main dashboard stats" },

  // ── CourierLock (every courier/* page) ────────────────────────────────
  { url: "/api/courier/account",     page: "*",                role: "critical",   note: "Flaship connection gate (duplicated)" },

  // ── Settings ──────────────────────────────────────────────────────────
  { url: "/api/settings/",           page: "/settings",         role: "critical",   note: "profile / auth / team / notifications" },

  // ── Connect courier ───────────────────────────────────────────────────
  { url: "/api/courier/connect",     page: "/connect-courier",  role: "mutation",   note: "Flaship API key setup" },

  // ── Ledger ────────────────────────────────────────────────────────────
  { url: "/api/ledger",              page: "/ledger",           role: "critical",   note: "profit & loss data" },

  // ── Tracking ──────────────────────────────────────────────────────────
  { url: "/api/tracking",            page: "/tracking",         role: "critical",   note: "public tracking lookup" },

  // ── Health check ─────────────────────────────────────────────────────
  { url: "/api/health",              page: "*",                role: "deferrable", note: "external API health" },
];

// ─── Runtime monitor ────────────────────────────────────────────────────────

export type RequestLogEntry = {
  id: string;
  url: string;
  method: string;
  page: string;
  role: "critical" | "deferrable" | "mutation" | "unknown";
  timing: number;           // ms until first response byte
  status: number | "error" | "pending";
  startTime: number;
  endTime: number | null;
  parallelWith: string[];   // IDs of requests that overlap
  note: string;
};

let logs: RequestLogEntry[] = [];
let enabled = false;
let pageLabel = "unknown";

export function isPerfMonitorEnabled() {
  if (typeof window === "undefined") return false;
  if (enabled) return true;
  const fromUrl = new URL(window.location.href).searchParams.has("perf");
  const fromStorage = localStorage.getItem("bns_perf") === "1";
  enabled = fromUrl || fromStorage;
  return enabled;
}

export function setPageLabel(label: string) {
  pageLabel = label;
}

function findProfile(url: string): RequestProfile | null {
  // exact match first
  for (const p of PROFILES) {
    if (p.url === url) return p;
  }
  // prefix match
  for (const p of PROFILES) {
    if (p.url.endsWith("/") && url.startsWith(p.url)) return p;
    if (url.startsWith(p.url) && p.url !== url) {
      // Only match if the URL continues with a meaningful segment
      const rest = url.slice(p.url.length);
      if (rest.startsWith("/") || rest.startsWith("?")) return p;
    }
  }
  return null;
}

export function enablePerfMonitor() {
  if (enabled || typeof window === "undefined") return;
  enabled = true;

  const originalFetch = window.fetch;
  window.fetch = function perfFetch(input, init?) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input);
    const method = init?.method || (input instanceof Request ? input.method : "GET");
    const startTime = performance.now();
    const id = `${method}-${url}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const profile = findProfile(url.split("?")[0]);
    const entry: RequestLogEntry = {
      id,
      url,
      method,
      page: pageLabel,
      role: profile?.role || "unknown",
      timing: 0,
      status: "pending",
      startTime,
      endTime: null,
      parallelWith: [],
      note: profile?.note || "",
    };
    logs.push(entry);

    // Find parallel requests (started within 50ms of each other)
    const pending = logs.filter(
      (l) => l.id !== id && l.status === "pending" && l.startTime > startTime - 200,
    );
    for (const p of pending) {
      if (!entry.parallelWith.includes(p.id)) entry.parallelWith.push(p.id);
      if (!p.parallelWith.includes(entry.id)) p.parallelWith.push(entry.id);
    }

    const result = originalFetch.call(window, input, init);

    result
      .then((res) => {
        entry.endTime = performance.now();
        entry.timing = entry.endTime - startTime;
        entry.status = res.status;
        printEntry(entry);
        return res;
      })
      .catch((err) => {
        entry.endTime = performance.now();
        entry.timing = entry.endTime - startTime;
        entry.status = "error";
        printEntry(entry);
        throw err;
      });

    return result;
  } as typeof fetch;
}

function printEntry(entry: RequestLogEntry) {
  if (!enabled) return;
  const timeStr = entry.timing.toFixed(0).padStart(5);
  const roleIcon =
    entry.role === "critical"
      ? "🔴"
      : entry.role === "deferrable"
        ? "🟡"
        : entry.role === "mutation"
          ? "🔵"
          : "⚪";
  const statusStr =
    entry.status === "pending"
      ? "…"
      : entry.status === "error"
        ? "ERR"
        : String(entry.status);

  // Shorten URL for display
  const shortUrl = entry.url.length > 70
    ? entry.url.slice(0, 35) + "…" + entry.url.slice(-32)
    : entry.url;

  const parallelInfo =
    entry.parallelWith.length > 0
      ? ` ║ +${entry.parallelWith.length} parallel`
      : "";

  console.log(
    `%c${roleIcon} %c${timeStr}ms %c${statusStr}%c %c${entry.method} %c${shortUrl}%c${parallelInfo}%c  ${entry.note}`,
    "font-weight:bold",
    "color:#00cc66;font-weight:bold",
    statusStr === "ERR" ? "color:red" : "color:#888",
    "",
    "color:#3b82f6;font-weight:bold",
    "",
    "color:#a855f7",
    "color:#999;font-size:11px",
  );
}

// ─── Summary dump ───────────────────────────────────────────────────────────

export function printSummary() {
  if (!enabled) return;
  const done = logs.filter((l) => l.status !== "pending");
  const critical = done.filter((l) => l.role === "critical");
  const deferrable = done.filter((l) => l.role === "deferrable");
  const mutations = done.filter((l) => l.role === "mutation");

  const totalTime = done.length
    ? Math.max(...done.map((l) => l.startTime + l.timing)) -
      Math.min(...done.map((l) => l.startTime))
    : 0;

  // Group parallel batches
  const visited = new Set<string>();
  const batches: RequestLogEntry[][] = [];
  for (const l of done) {
    if (visited.has(l.id)) continue;
    const batch = [l];
    visited.add(l.id);
    for (const pid of l.parallelWith) {
      const peer = logs.find((x) => x.id === pid);
      if (peer && !visited.has(peer.id)) {
        batch.push(peer);
        visited.add(peer.id);
      }
    }
    batches.push(batch);
  }

  console.log("");
  console.log("%c══════════════════ PERF MONITOR SUMMARY ══════════════════", "font-weight:bold;font-size:14px");
  console.log(`  Page: ${pageLabel}`);
  console.log(`  Total waterfall: ${totalTime.toFixed(0)}ms`);
  console.log(`  Total requests:  ${done.length} (${critical.length} critical, ${deferrable.length} deferrable, ${mutations.length} mutations)`);
  console.log("");

  for (const batch of batches) {
    const batchTime = Math.max(...batch.map((l) => l.startTime + l.timing));
    const batchStart = Math.min(...batch.map((l) => l.startTime));
    const relativeStart = (batchStart - Math.min(...done.map((l) => l.startTime))).toFixed(0);
    const batchDuration = (batchTime - batchStart).toFixed(0);
    console.log(`%c── Batch [+${relativeStart}ms → +${(parseInt(relativeStart) + parseInt(batchDuration)).toFixed(0)}ms | ${batchDuration}ms]%c  ${batch.length} request(s)`, "color:#a855f7", "color:#999");

    for (const l of batch) {
      const relStart = (l.startTime - Math.min(...done.map((l) => l.startTime))).toFixed(0);
      const icon = l.role === "critical" ? "🔴" : l.role === "deferrable" ? "🟡" : l.role === "mutation" ? "🔵" : "⚪";
      console.log(`  ${icon} ${l.method} ${l.url}  → ${l.timing.toFixed(0)}ms (starts at +${relStart}ms)`);
    }
  }

  // Recommendations
  console.log("");
  console.log("%c🔍 RECOMMENDATIONS", "font-weight:bold;font-size:13px");
  if (critical.length === 0) {
    console.log("  ✅ All requests are deferrable or mutations — good.");
  }
  // Check for serial critical requests
  for (const batch of batches) {
    const critInBatch = batch.filter((l) => l.role === "critical");
    if (critInBatch.length > 0 && batch.length > 1) {
      const deferInBatch = batch.filter((l) => l.role !== "critical");
      if (deferInBatch.length > 0) {
        for (const d of deferInBatch) {
          console.log(`  ⚠  Deferrable request runs IN CRITICAL BATCH: ${d.method} ${d.url}`);
          console.log(`     → Move after critical requests complete to reduce blocking time.`);
        }
      }
    }
  }
  // Check for sequential critical requests that could be parallel
  for (let i = 1; i < batches.length; i++) {
    const prevCrit = batches[i - 1].filter((l) => l.role === "critical");
    const currCrit = batches[i].filter((l) => l.role === "critical");
    if (prevCrit.length > 0 && currCrit.length > 0) {
      for (const c of currCrit) {
        const p = prevCrit[prevCrit.length - 1];
        if (c.startTime > p.startTime + p.timing + 50) {
          console.log(`  ⚠  Sequential critical requests: ${p.method} ${p.url} → ${c.method} ${c.url}`);
          console.log(`     → These could run in parallel to save ${c.timing.toFixed(0)}ms.`);
          break;
        }
      }
    }
  }
  console.log("%c═══════════════════════════════════════════════════════════", "font-weight:bold;font-size:14px");
}
