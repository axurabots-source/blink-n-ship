import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

const MODULES = ['dashboard', 'orders', 'products', 'ledger', 'settings'];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const members = await prisma.teamMember.findMany({
      where: { ownerId: user.id },
      include: { permissions: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ members });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { email, name, phone, role } = await request.json();
    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    const existing = await prisma.teamMember.findFirst({
      where: { ownerId: user.id, email },
    });
    if (existing) {
      return NextResponse.json({ error: 'A team member with this email already exists' }, { status: 409 });
    }

    const member = await prisma.teamMember.create({
      data: {
        ownerId: user.id,
        email,
        name,
        phone: phone || null,
        role: role || 'employee',
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
