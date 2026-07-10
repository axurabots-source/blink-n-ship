const isDev = process.env.NODE_ENV === 'development';

const SENSITIVE_KEYS = new Set([
  'password', 'api_key', 'apiKey', 'secret', 'token', 'authorization',
  'cookie', 'session', 'jwt', 'accessToken', 'refreshToken', 'privateKey',
  'phone', 'phoneNumber', 'email', 'address', 'customerName', 'consigneeName',
  'recipientName', 'recipientPhone', 'recipientAddress', 'recipientCity',
  'rawInput', 'raw_text', 'rawText',
  'creditCard', 'credit_card', 'cardNumber', 'card_number', 'cvv', 'cvv2',
  'ssn', 'dob', 'dateOfBirth', 'bankAccount', 'iban', 'routingNumber',
  'encryptedCredentials', 'encrypted_credentials',
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[deep]';
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(v => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) {
        cleaned[k] = '[REDACTED]';
      } else if (typeof v === 'object' && v !== null) {
        cleaned[k] = sanitize(v, depth + 1);
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  }
  return value;
}

function emit(level: string, category: string, message: string, meta?: Record<string, unknown>) {
  const entry: Record<string, unknown> = {
    t: new Date().toISOString(),
    lvl: level,
    cat: category,
    msg: message,
  };
  if (meta) entry.meta = sanitize(meta);

  if (isDev) {
    const prefix = `[${level}] [${category}]`;
    const line = meta ? `${prefix} ${message} ${JSON.stringify(entry.meta)}` : `${prefix} ${message}`;
    if (level === 'ERROR' || level === 'SECURITY') console.error(line);
    else if (level === 'WARN') console.warn(line);
    else console.log(line);
  } else {
    const line = JSON.stringify(entry);
    if (level === 'ERROR' || level === 'SECURITY') console.error(line);
    else if (level === 'WARN') console.warn(line);
    else console.log(line);
  }
}

export const log = {
  info: (cat: string, msg: string, meta?: Record<string, unknown>) => emit('INFO', cat, msg, meta),
  warn: (cat: string, msg: string, meta?: Record<string, unknown>) => emit('WARN', cat, msg, meta),
  error: (cat: string, msg: string, meta?: Record<string, unknown>) => emit('ERROR', cat, msg, meta),
  security: (cat: string, msg: string, meta?: Record<string, unknown>) => emit('SECURITY', cat, msg, meta),
  debug: (cat: string, msg: string, meta?: Record<string, unknown>) => {
    if (isDev) emit('DEBUG', cat, msg, meta);
  },
};
