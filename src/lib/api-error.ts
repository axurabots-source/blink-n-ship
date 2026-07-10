import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';

const isDev = process.env.NODE_ENV === 'development';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

function getSafeMessage(original: string): string {
  if (isDev) return original;
  return 'Something went wrong. Please try again.';
}

export function apiError(err: unknown, status = 500) {
  const message = getErrorMessage(err);
  log.error('API', `HTTP ${status}`, {
    error: message,
    ...(err instanceof Error && isDev ? { stack: err.stack } : {}),
  });
  return NextResponse.json({ error: getSafeMessage(message) }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
