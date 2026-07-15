import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { sanitizeString, sanitizeOptionalString, isValidEmail } from '@/lib/validation';
import { apiError } from '@/lib/api-error';
import { rateLimit, Limit } from '@/lib/rate-limit';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let profile = await prisma.profile.findUnique({ where: { id: user.id } });
    
    if (!profile) {
      // Auto-create profile from auth metadata
      profile = await prisma.profile.create({
        data: {
          id: user.id,
          businessName: user.user_metadata?.business_name || user.user_metadata?.businessName || 'My Business',
          accountType: '',
          email: user.email || null,
          phone: user.phone || user.user_metadata?.phone || null,
          flashipConnected: false,
        }
      });
    } else {
      // Check if some fields are missing and auto-sync them from auth user data
      const updates: Record<string, any> = {};
      let needsUpdate = false;

      if (!profile.email && user.email) {
        updates.email = user.email;
        needsUpdate = true;
      }
      const fallbackPhone = user.phone || user.user_metadata?.phone;
      if (!profile.phone && fallbackPhone) {
        updates.phone = fallbackPhone;
        needsUpdate = true;
      }
      const fallbackBusiness = user.user_metadata?.business_name || user.user_metadata?.businessName;
      if (!profile.businessName && fallbackBusiness) {
        updates.businessName = fallbackBusiness;
        needsUpdate = true;
      }

      if (needsUpdate) {
        profile = await prisma.profile.update({
          where: { id: user.id },
          data: updates,
        });
      }
    }

    const { id, ...rest } = profile;
    return NextResponse.json({ profile: { id, ...rest } });
  } catch (err: any) {
    return apiError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const rl = rateLimit('profile', user.id, Limit.general);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.businessName !== undefined) updates.businessName = sanitizeString(body.businessName, 200);
    if (body.ownerName !== undefined) updates.ownerName = sanitizeString(body.ownerName, 200);
    if (body.email !== undefined) {
      const clean = sanitizeString(body.email);
      if (!isValidEmail(clean)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      updates.email = clean;
    }
    if (body.phone !== undefined) updates.phone = sanitizeOptionalString(body.phone, 20);
    if (body.address !== undefined) updates.address = sanitizeString(body.address, 500);
    if (body.logoUrl !== undefined) updates.logoUrl = sanitizeString(body.logoUrl, 500);
    if (body.website !== undefined) updates.website = sanitizeString(body.website, 200);

    const profile = await prisma.profile.update({
      where: { id: user.id },
      data: updates,
    });

    return NextResponse.json({ profile });
  } catch (err: any) {
    return apiError(err);
  }
}
