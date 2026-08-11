import { notFound } from 'next/navigation';
import type { AuthContext } from '@/lib/auth/session';

export function getScopedOrganizationId(ctx: AuthContext): string | null {
  if (ctx.user.role === 'SUPER_ADMIN') return null;
  return ctx.user.organization_id;
}

export function assertOrganizationAccess(ctx: AuthContext, organizationId: string): void {
  if (ctx.user.role === 'SUPER_ADMIN') return;
  if (ctx.user.organization_id !== organizationId) {
    notFound();
  }
}

export function resolveOrganizationIdForCreate(ctx: AuthContext): string {
  return ctx.user.organization_id;
}
