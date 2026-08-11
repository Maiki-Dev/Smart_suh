import 'server-only';
import { notFound, redirect } from 'next/navigation';
import type { UserRole } from '@/types';
import { requireAuth as baseRequireAuth, type AuthContext } from '@/lib/auth/session';
import { getApartmentById } from '@/lib/queries/apartments';
import { listResidentsByApartment } from '@/lib/queries/residents';

export { baseRequireAuth as requireAuth };

const ADMIN_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'SUPER_ADMIN',
  'HOA_ADMIN',
  'OPERATOR',
]);

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.has(role);
}

export async function requireRole(allowedRoles: readonly UserRole[]): Promise<AuthContext> {
  const ctx = await baseRequireAuth();
  if (!allowedRoles.includes(ctx.user.role)) {
    const isResident = ctx.user.role === 'RESIDENT';
    redirect(isResident ? '/resident' : '/admin');
  }
  return ctx;
}

export async function requireAdminRole(): Promise<AuthContext> {
  return requireRole(['SUPER_ADMIN', 'HOA_ADMIN', 'OPERATOR']);
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  return requireRole(['SUPER_ADMIN']);
}

export async function requireOrganizationAccess(
  organizationId: string,
): Promise<AuthContext> {
  const ctx = await baseRequireAuth();

  if (ctx.user.role === 'SUPER_ADMIN') return ctx;

  if (ctx.user.organization_id !== organizationId) {
    notFound();
  }
  return ctx;
}

export async function requireApartmentAccess(
  apartmentId: string,
): Promise<{
  ctx: AuthContext;
  apartment: { id: string; organization_id: string; building_id: string; apartment_number: string };
  isOwner: boolean;
  isResident: boolean;
}> {
  const ctx = await baseRequireAuth();

  const apartment = await getApartmentById(apartmentId);
  if (!apartment) notFound();

  if (ctx.user.role === 'SUPER_ADMIN') {
    return { ctx, apartment, isOwner: true, isResident: true };
  }

  if (ctx.user.organization_id !== apartment.organization_id) {
    notFound();
  }

  if (isAdminRole(ctx.user.role)) {
    const { data } = await listResidentsByApartment(apartment.id, { limit: 1 });
    const _dummy = data.length;
    void _dummy;
    return { ctx, apartment, isOwner: false, isResident: true };
  }

  const { data: residents } = await listResidentsByApartment(apartment.id, { limit: 500 });

  if (ctx.user.role === 'RESIDENT') {
    const match = residents.find(
      (r) => r.user_id === ctx.user.id,
    );
    if (!match) notFound();
    return {
      ctx,
      apartment,
      isOwner: !!match.is_owner,
      isResident: true,
    };
  }

  notFound();
}

export function getDefaultLandingPathForRole(role: UserRole): `/admin` | `/resident` {
  if (role === 'RESIDENT') return '/resident';
  return '/admin';
}
