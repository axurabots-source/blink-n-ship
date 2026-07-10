import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let prefs = await prisma.notificationPreference.findUnique({ where: { ownerId: user.id } });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({ data: { ownerId: user.id } });
    }

    return NextResponse.json({ preferences: prefs });
  } catch (err: any) {
    return apiError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const allowedFields = [
      'orderBooked', 'orderDelivered', 'orderReturned', 'bookingFailed',
      'lowStock', 'employeeLogin', 'permissionChange',
      'dailySummary', 'weeklySummary', 'monthlySummary',
    ];
    const updates: Record<string, any> = {};

    for (const key of allowedFields) {
      if (typeof body[key] === 'boolean') {
        updates[key] = body[key];
      }
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { ownerId: user.id },
      update: updates,
      create: { ownerId: user.id, ...updates },
    });

    return NextResponse.json({ preferences });
  } catch (err: any) {
    return apiError(err);
  }
}
