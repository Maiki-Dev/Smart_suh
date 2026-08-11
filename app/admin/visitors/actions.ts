'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import { createAuditLog } from '@/lib/queries/audit_logs';
import { getVisitorPassById, updateVisitorPassStatus } from '@/lib/queries/visitors';

export type VisitorActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export async function cancelVisitorPassAction(passId: string): Promise<VisitorActionState> {
  const ctx = await requireAdminRole();
  const pass = await getVisitorPassById(passId);
  if (!pass) return { status: 'error', message: 'Зочны эрх олдсонгүй' };
  assertOrganizationAccess(ctx, pass.organization_id);
  if (pass.status !== 'ACTIVE') {
    return { status: 'error', message: 'Зөвхөн идэвхтэй эрхийг цуцлах боломжтой' };
  }

  await updateVisitorPassStatus(passId, 'CANCELLED');
  await createAuditLog({
    organization_id: pass.organization_id,
    actor_id: ctx.user.id,
    action: 'VISITOR_PASS_CANCELLED',
    entity_type: 'visitor_pass',
    entity_id: passId,
    old_data: { status: 'ACTIVE' },
    new_data: { status: 'CANCELLED' },
  });

  revalidatePath('/admin/visitors');
  revalidatePath('/resident/visitors');
  return { status: 'success', message: 'Зочны эрх цуцлагдлаа' };
}

export async function markVisitorUsedAction(passId: string): Promise<VisitorActionState> {
  const ctx = await requireAdminRole();
  const pass = await getVisitorPassById(passId);
  if (!pass) return { status: 'error', message: 'Зочны эрх олдсонгүй' };
  assertOrganizationAccess(ctx, pass.organization_id);
  if (pass.status !== 'ACTIVE') {
    return { status: 'error', message: 'Зөвхөн идэвхтэй эрхийг тэмдэглэх боломжтой' };
  }

  await updateVisitorPassStatus(passId, 'USED');
  await createAuditLog({
    organization_id: pass.organization_id,
    actor_id: ctx.user.id,
    action: 'VISITOR_PASS_USED',
    entity_type: 'visitor_pass',
    entity_id: passId,
    old_data: { status: 'ACTIVE' },
    new_data: { status: 'USED' },
  });

  revalidatePath('/admin/visitors');
  return { status: 'success', message: 'Зочин ашигласан гэж тэмдэглэгдлээ' };
}
