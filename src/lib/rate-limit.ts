interface RateLimitConfig {
  max: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }
}

export function rateLimit(
  namespace: string,
  identifier: string,
  config: RateLimitConfig,
): { success: boolean; remaining: number; resetInMs: number } {
  if (!stores.has(namespace)) stores.set(namespace, new Map());
  const store = stores.get(namespace)!;
  const now = Date.now();

  const existing = store.get(identifier);
  if (existing && now < existing.resetAt) {
    if (existing.count >= config.max) {
      cleanup();
      return { success: false, remaining: 0, resetInMs: existing.resetAt - now };
    }
    existing.count++;
    cleanup();
    return { success: true, remaining: config.max - existing.count, resetInMs: existing.resetAt - now };
  }

  store.set(identifier, { count: 1, resetAt: now + config.windowMs });
  cleanup();
  return { success: true, remaining: config.max - 1, resetInMs: config.windowMs };
}

export const Limit = {
  auth: { max: 5, windowMs: 60_000 },
  ai: { max: 10, windowMs: 60_000 },
  booking: { max: 30, windowMs: 60_000 },
  sync: { max: 5, windowMs: 300_000 },
  general: { max: 60, windowMs: 60_000 },
  team: { max: 10, windowMs: 60_000 },
  sensitive: { max: 3, windowMs: 60_000 },
  upload: { max: 10, windowMs: 60_000 },
} as const;
