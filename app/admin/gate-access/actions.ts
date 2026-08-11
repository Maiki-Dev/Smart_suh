'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { syncAllGateAccess } from '@/lib/gate/sync-all-gate-access';

export type GateAccessActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export async function syncGateAccessAction(): Promise<GateAccessActionState> {
  const ctx = await requireAdminRole();
  const orgId = getScopedOrganizationId(ctx) ?? ctx.user.organization_id;

  try {
    const result = await syncAllGateAccess(orgId);

    revalidatePath('/admin/gate-access');
    revalidatePath('/admin/vehicles');
    revalidatePath('/admin');
    revalidatePath('/resident/vehicle');
    revalidatePath('/resident');

    const errorNote =
      result.errors.length > 0 ? ` (${result.errors.length} алдаа)` : '';

    return {
      status: 'success',
      message: `${result.processed} орон сууц шалгасан, ${result.changed} машины эрх өөрчлөгдлөө${errorNote}`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}
