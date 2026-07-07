import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export type PermissionModule = 'dashboard' | 'orders' | 'products' | 'ledger' | 'settings';

export interface ModulePermissions {
  canView: boolean;
  canViewFinancial: boolean;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export type PermissionMap = Record<PermissionModule, ModulePermissions>;

export interface AuthContext {
  type: 'owner' | 'employee';
  userId: string;
  profileId: string;
  profile: any;
  permissions: PermissionMap | null;
}

export const DEFAULT_OWNER_PERMISSIONS: PermissionMap = {
  dashboard: { canView: true, canViewFinancial: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
  orders:    { canView: true, canViewFinancial: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
  products:  { canView: true, canViewFinancial: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
  ledger:    { canView: true, canViewFinancial: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
  settings:  { canView: true, canViewFinancial: true, canCreate: true, canRead: true, canUpdate: true, canDelete: true },
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (profile) {
    return {
      type: 'owner',
      userId: user.id,
      profileId: profile.id,
      profile,
      permissions: DEFAULT_OWNER_PERMISSIONS,
    };
  }

  const teamMember = await prisma.teamMember.findUnique({
    where: { supabaseId: user.id },
    include: { permissions: true },
  });

  if (teamMember && teamMember.status === 'active') {
    const ownerProfile = await prisma.profile.findUnique({ where: { id: teamMember.ownerId } });
    if (!ownerProfile) return null;

    const permMap = buildPermissionMap(teamMember.permissions);
    return {
      type: 'employee',
      userId: user.id,
      profileId: teamMember.ownerId,
      profile: ownerProfile,
      permissions: permMap,
    };
  }

  return null;
}

export function buildPermissionMap(
  perms: { module: string; canView: boolean; canViewFinancial: boolean; canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }[]
): PermissionMap {
  const defaults: ModulePermissions = { canView: false, canViewFinancial: false, canCreate: false, canRead: false, canUpdate: false, canDelete: false };
  const modules: PermissionModule[] = ['dashboard', 'orders', 'products', 'ledger', 'settings'];
  const map = {} as PermissionMap;
  for (const mod of modules) {
    const found = perms.find(p => p.module === mod);
    map[mod] = found
      ? { canView: found.canView, canViewFinancial: found.canViewFinancial, canCreate: found.canCreate, canRead: found.canRead, canUpdate: found.canUpdate, canDelete: found.canDelete }
      : { ...defaults };
  }
  return map;
}

export function canAccessModule(permissions: PermissionMap | null, module: PermissionModule): boolean {
  if (!permissions) return false;
  return permissions[module]?.canView ?? false;
}

export function canViewFinancial(permissions: PermissionMap | null, module: PermissionModule): boolean {
  if (!permissions) return false;
  return permissions[module]?.canViewFinancial ?? false;
}

export function canPerformAction(permissions: PermissionMap | null, module: PermissionModule, action: 'create' | 'read' | 'update' | 'delete'): boolean {
  if (!permissions) return false;
  return permissions[module]?.[action === 'create' ? 'canCreate' : action === 'read' ? 'canRead' : action === 'update' ? 'canUpdate' : 'canDelete'] ?? false;
}
