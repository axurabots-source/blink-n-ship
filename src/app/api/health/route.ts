import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Database connectivity check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (e) {
    checks.database = 'failed';
    healthy = false;
  }

  const status = healthy ? 200 : 503;

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
    { status },
  );
}
