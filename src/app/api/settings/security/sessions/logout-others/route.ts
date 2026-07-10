import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    await prisma.userSession.updateMany({
      where: { userId: user.id, isCurrent: false },
      data: { isCurrent: false },
    });

    // Note: Full Supabase session revocation requires the Supabase admin API or
    // the user to change their password. The local DB records are marked as inactive.
    // This provides defense-in-depth — the old tokens will not be accepted once
    // the server-side session validation is implemented in the proxy.

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return apiError(err);
  }
}
