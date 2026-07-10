const processed = new Map<string, number>();
const IDEMPOTENCY_TTL = 30_000;
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

export function checkIdempotency(key: string): boolean {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [k, ts] of processed) {
      if (now - ts > IDEMPOTENCY_TTL) processed.delete(k);
    }
    lastCleanup = now;
  }
  const existing = processed.get(key);
  if (existing && now - existing < IDEMPOTENCY_TTL) return false;
  processed.set(key, now);
  return true;
}

export function makeIdempotencyKey(userId: string, action: string, payload: unknown): string {
  return `${userId}:${action}:${JSON.stringify(payload)}`;
}
