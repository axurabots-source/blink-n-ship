import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';
import { sanitizeString, sanitizeOptionalString, isValidEmail } from '@/lib/validation';
import { apiError } from '@/lib/api-error';
import { rateLimit, Limit } from '@/lib/rate-limit';

const MODULES = ['dashboard', 'orders', 'products', 'ledger', 'settings'];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const rl = rateLimit('team', user.id, Limit.team);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 });
    }

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const members = await prisma.teamMember.findMany({
      where: { ownerId: user.id },
      include: { permissions: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ members });
  } catch (err: any) {
    return apiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const rl = rateLimit('team', user.id, Limit.team);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many team invitations. Please wait before trying again.' }, { status: 429 });
    }

    const raw = await request.json();
    const email = sanitizeString(raw.email);
    const name = sanitizeString(raw.name, 200);
    const phone = sanitizeOptionalString(raw.phone, 20);
    const role = sanitizeString(raw.role, 50) || 'employee';

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const [profile, existing] = await Promise.all([
      prisma.profile.findUnique({ where: { id: user.id } }),
      prisma.teamMember.findFirst({
        where: { ownerId: user.id, email },
      }),
    ]);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (existing) {
      return NextResponse.json({ error: 'A team member with this email already exists' }, { status: 409 });
    }

    const member = await prisma.teamMember.create({
      data: {
        ownerId: user.id,
        email,
        name,
        phone: phone || null,
        role,
        status: 'invited',
        permissions: {
          create: MODULES.map(module => ({
            module,
            canView: module === 'dashboard',
            canViewFinancial: false,
            canCreate: false,
            canRead: false,
            canUpdate: false,
            canDelete: false,
          })),
        },
      },
      include: { permissions: true },
    });

    await logActivity({
      ownerId: user.id,
      userId: user.id,
      userName: profile.businessName || profile.id,
      userEmail: user.email,
      action: 'invited',
      module: 'team',
      description: `Invited team member: ${name} (${email})`,
      metadata: { memberId: member.id, email, name, role },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (err: any) {
    return apiError(err);
  }
}
