import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { id, ...rest } = profile;
    return NextResponse.json({ profile: { id, ...rest } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const allowedFields = ['businessName', 'ownerName', 'email', 'phone', 'address', 'logoUrl', 'website'];
    const updates: Record<string, any> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const profile = await prisma.profile.update({
      where: { id: user.id },
      data: updates,
    });

    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
