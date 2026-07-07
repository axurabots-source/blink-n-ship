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

    return NextResponse.json({ permissions: member.permissions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const existing = await prisma.teamMember.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!existing) return NextResponse.json({ error: 'Team member not found' }, { status: 404 });

    const { permissions } = await request.json();
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array' }, { status: 400 });
    }

    for (const perm of permissions) {
      await prisma.teamMemberPermission.upsert({
        where: { memberId_module: { memberId: id, module: perm.module } },
        update: {
          canView: perm.canView ?? false,
          canViewFinancial: perm.canViewFinancial ?? false,
          canCreate: perm.canCreate ?? false,
          canRead: perm.canRead ?? false,
          canUpdate: perm.canUpdate ?? false,
          canDelete: perm.canDelete ?? false,
        },
        create: {
          memberId: id,
          module: perm.module,
          canView: perm.canView ?? false,
          canViewFinancial: perm.canViewFinancial ?? false,
          canCreate: perm.canCreate ?? false,
          canRead: perm.canRead ?? false,
          canUpdate: perm.canUpdate ?? false,
          canDelete: perm.canDelete ?? false,
        },
      });
    }

    const updated = await prisma.teamMember.findUnique({
      where: { id },
      include: { permissions: true },
    });

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    await logActivity({
      ownerId: user.id,
      userId: user.id,
      userName: profile?.businessName || user.id,
      userEmail: user.email,
      action: 'updated',
      module: 'team',
      description: `Updated permissions for ${existing.name}`,
      metadata: { memberId: id, permissions },
    });

    return NextResponse.json({ permissions: updated?.permissions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
