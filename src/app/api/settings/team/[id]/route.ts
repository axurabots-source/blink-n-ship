import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const member = await prisma.teamMember.findFirst({
      where: { id, ownerId: user.id },
      include: { permissions: true },
    });
    if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 });

    return NextResponse.json({ member });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const existing = await prisma.teamMember.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!existing) return NextResponse.json({ error: 'Team member not found' }, { status: 404 });

    const body = await request.json();
    const allowedFields = ['name', 'email', 'phone', 'role', 'status'];
    const updates: Record<string, any> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const member = await prisma.teamMember.update({
      where: { id },
      data: updates,
      include: { permissions: true },
    });

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    const action = body.status === 'suspended' ? 'suspended' : body.status === 'active' ? 'activated' : 'updated';

    await logActivity({
      ownerId: user.id,
      userId: user.id,
      userName: profile?.businessName || user.id,
      userEmail: user.email,
      action,
      module: 'team',
      description: `${action} team member: ${member.name} (${member.email})`,
      metadata: { memberId: id, updates },
    });

    return NextResponse.json({ member });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const existing = await prisma.teamMember.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!existing) return NextResponse.json({ error: 'Team member not found' }, { status: 404 });

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });

    await prisma.teamMember.delete({ where: { id } });

    await logActivity({
      ownerId: user.id,
      userId: user.id,
      userName: profile?.businessName || user.id,
      userEmail: user.email,
      action: 'deleted',
      module: 'team',
      description: `Deleted team member: ${existing.name} (${existing.email})`,
      metadata: { memberId: id, email: existing.email, name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
