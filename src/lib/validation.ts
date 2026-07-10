export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export function sanitizeOptionalString(value: unknown, maxLength = 500): string | null {
  if (value === null || value === undefined) return null;
  return sanitizeString(value, maxLength);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validatePhone(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return digits;
  if (digits.length === 10 && digits.startsWith('3')) return '0' + digits;
  if (digits.startsWith('92') && digits.length === 12) return '0' + digits.substring(2);
  return digits;
}

export function validatePositiveNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

export function validatePositiveStrict(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

export function safePagination(page: unknown, limit: unknown, maxLimit = 100): { page: number; limit: number; skip: number } {
  const p = Math.max(1, Math.floor(Number(page) || 1));
  const l = Math.min(maxLimit, Math.max(1, Math.floor(Number(limit) || 20)));
  return { page: p, limit: l, skip: (p - 1) * l };
}
