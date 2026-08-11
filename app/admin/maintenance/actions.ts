'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import { updateMaintenanceStatus } from '@/lib/maintenance/maintenance-service';
import {
  getMaintenanceRequestById,
  updateMaintenanceRequest,
} from '@/lib/queries/maintenance';
import type { MaintenancePriority, MaintenanceStatus } from '@/types';

export type MaintenanceActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const maintenanceStatuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'] as const;
const maintenancePriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const emptyToNull = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const updateSchema = z.object({
  id: z.string().uuid('Асуудал олдсонгүй'),
  status: z.enum(maintenanceStatuses),
  priority: z.enum(maintenancePriorities),
  assignedTo: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  comment: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional()),
});

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function revalidateMaintenancePaths(id: string) {
  revalidatePath('/admin/maintenance');
  revalidatePath(`/admin/maintenance/${id}`);
  revalidatePath('/admin');
  revalidatePath('/resident');
}

export async function updateMaintenanceAction(
  _prev: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const ctx = await requireAdminRole();
  const parsed = updateSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await getMaintenanceRequestById(parsed.data.id);
  if (!existing) return { status: 'error', message: 'Асуудал олдсонгүй' };
  assertOrganizationAccess(ctx, existing.organization_id);

  try {
    if (parsed.data.priority !== existing.priority) {
      await updateMaintenanceRequest(parsed.data.id, {
        priority: parsed.data.priority as MaintenancePriority,
      });
    }

    const statusChanged = parsed.data.status !== existing.status;
    const hasComment = !!parsed.data.comment?.trim();
    const hasAssignee = !!parsed.data.assignedTo;

    if (statusChanged || hasComment || hasAssignee) {
      await updateMaintenanceStatus({
        requestId: parsed.data.id,
        status: parsed.data.status as MaintenanceStatus,
        actorId: ctx.user.id,
        organizationId: existing.organization_id,
        assignedTo: parsed.data.assignedTo ?? undefined,
        comment: parsed.data.comment ?? undefined,
      });
    }

    revalidateMaintenancePaths(parsed.data.id);
    return { status: 'success', message: 'Засварын хүсэлт шинэчлэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}
