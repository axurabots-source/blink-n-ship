import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface Entry {
  count: number;
  resetAt: number;
}

const ipStore = new Map<string, Entry>();

function getIp(req: NextRequest): string {
  // Prefer x-real-ip (set by platform reverse proxy) over x-forwarded-for (spoofable by client)
  return req.headers.get('x-real-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || '127.0.0.1';
}

function checkLimit(identifier: string, max: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = ipStore.get(identifier);
  if (existing && now < existing.resetAt) {
    if (existing.count >= max) {
      return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
    }
    existing.count++;
    return { allowed: true, retryAfter: 0 };
  }
  ipStore.set(identifier, { count: 1, resetAt: now + windowMs });
  return { allowed: true, retryAfter: 0 };
}

const API_PREFIX = '/api/';
const MAX_BODY_SIZE = 100_000;

function isPageRequest(req: NextRequest): boolean {
  const accept = req.headers.get('accept') || '';
  return accept.includes('text/html');
}

function jsonError(status: number, message: string, retryAfter?: number): NextResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  };
  if (retryAfter) headers['Retry-After'] = String(retryAfter);
  return new NextResponse(JSON.stringify({ error: message }), { status, headers });
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers.get('x-forwarded-proto') || '';
    if (proto === 'http') {
      const url = req.nextUrl.clone();
      url.protocol = 'https';
      return NextResponse.redirect(url);
    }
  }

  // AI extraction rate limit
  if (pathname === '/api/orders/extract') {
    const ip = getIp(req);
    const result = checkLimit(`ai:${ip}`, 10, 60_000);
    if (!result.allowed) {
      return jsonError(429, 'Too many AI requests. Please wait before trying again.', result.retryAfter);
    }
  }

  // General API rate limit
  if (pathname.startsWith(API_PREFIX) && pathname !== '/api/orders/extract') {
    const ip = getIp(req);
    const result = checkLimit(`api:${ip}`, 120, 60_000);
    if (!result.allowed) {
      return jsonError(429, 'Too many requests. Please slow down.', result.retryAfter);
    }
  }

  // Body size limit for non-GET API requests
  if (pathname.startsWith(API_PREFIX) && req.method !== 'GET') {
    const contentLength = req.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_BODY_SIZE) {
      return jsonError(413, 'Request body too large');
    }
  }

  const response = NextResponse.next();

  // ─── Security headers for ALL responses ─────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ─── Production-only headers ────────────────────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://xnbuuekgtilkdyuznxef.supabase.co https://partners.flaship.pk",
        "frame-src 'none'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    );
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    );
  }

  // ─── Cache-Control for HTML pages ───────────────────────────────────────
  // Prevent browser caching of authenticated pages (login, dashboard, orders, etc.)
  if (isPageRequest(req)) {
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)$).*)',
  ],
};
