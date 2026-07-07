import { NextResponse } from 'next/server';
import { getAuthContext, DEFAULT_OWNER_PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({
      isOwner: ctx.type === 'owner',
      permissions: ctx.permissions,
      profile: {
        id: ctx.profile.id,
        businessName: ctx.profile.businessName,
        accountType: ctx.profile.accountType,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
