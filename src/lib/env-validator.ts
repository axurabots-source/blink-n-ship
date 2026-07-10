const REQUIRED_SERVER = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'GEMINI_API_KEY',
  'CREDENTIALS_ENCRYPTION_KEY',
] as const;

const REQUIRED_CLIENT = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

let validated = false;

function isServerSide(): boolean {
  return typeof window === 'undefined';
}

export function validateEnv(): void {
  if (validated) return;
  validated = true;

  const missing: string[] = [];
  const keys = isServerSide() ? REQUIRED_SERVER : REQUIRED_CLIENT;

  for (const key of keys) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please set them in your .env file or deployment environment.'
    );
  }

  const encryptionKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (encryptionKey && encryptionKey.length !== 64) {
    throw new Error(
      'CREDENTIALS_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
      `Got ${encryptionKey.length} characters.`
    );
  }
}
