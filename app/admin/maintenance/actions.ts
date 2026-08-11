'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import {
  applyMaintenanceUpdate,
  notifyApartmentResidents,
  notifyMaintenanceStaff,
} from '@/lib/maintenance/maintenance-service';
import {
  createMaintenanceComment,
  getMaintenanceRequestById,
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

const commentSchema = z.object({
  id: z.string().uuid('Асуудал олдсонгүй'),
  comment: z.string().trim().min(1, 'Тайлбар оруулна уу').max(2000),
});

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function revalidateMaintenancePaths(id: string) {
  revalidatePath('/admin/maintenance');
  revalidatePath(`/admin/maintenance/${id}`);
  revalidatePath('/admin');
  revalidatePath('/resident/maintenance');
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
    await applyMaintenanceUpdate({
      requestId: parsed.data.id,
      status: parsed.data.status as MaintenanceStatus,
      priority: parsed.data.priority as MaintenancePriority,
      actorId: ctx.user.id,
      organizationId: existing.organization_id,
      assignedTo: parsed.data.assignedTo ?? null,
      comment: parsed.data.comment ?? undefined,
    });

    revalidateMaintenancePaths(parsed.data.id);
    return { status: 'success', message: 'Засварын хүсэлт шинэчлэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function addMaintenanceCommentAction(
  _prev: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const ctx = await requireAdminRole();
  const parsed = commentSchema.safeParse(formToObject(formData));

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
    await createMaintenanceComment({
      request_id: parsed.data.id,
      user_id: ctx.user.id,
      comment: parsed.data.comment,
    });

    await notifyApartmentResidents(
      existing.organization_id,
      existing.apartment_id,
      'Засварын хүсэлтэд тайлбар нэмэгдлээ',
      `"${existing.title}" хүсэлтэд админ тайлбар үлдээлээ.`,
    );

    revalidateMaintenancePaths(parsed.data.id);
    return { status: 'success', message: 'Тайлбар нэмэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}
