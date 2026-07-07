import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const sessions = await prisma.userSession.findMany({
      where: { userId: user.id },
      orderBy: { lastActiveAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ sessions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { browserInfo, os, device, ipAddress } = body;

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        browserInfo: browserInfo || null,
        os: os || null,
        device: device || null,
        ipAddress: ipAddress || null,
        isCurrent: true,
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
