'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole, requireApartmentAccess } from '@/lib/permissions';
import { getResidentApartmentContext } from '@/lib/resident/context';
import { createAuditLog } from '@/lib/queries/audit_logs';
import {
  createMaintenanceComment,
  createMaintenanceRequest,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
} from '@/lib/queries/maintenance';
import type { MaintenanceCategory, MaintenancePriority } from '@/types';

export type ResidentMaintenanceActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const categories = ['STRUCTURAL', 'PLUMBING', 'ELECTRICAL', 'HVAC', 'CLEANING', 'OTHER'] as const;
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const createSchema = z.object({
  title: z.string().trim().min(1, 'Гарчиг заавал').max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  category: z.enum(categories),
  priority: z.enum(priorities),
});

const commentSchema = z.object({
  request_id: z.string().uuid(),
  comment: z.string().trim().min(1, 'Сэтгэгдэл заавал').max(2000),
});

const closeSchema = z.object({
  request_id: z.string().uuid(),
});

export async function createMaintenanceRequestAction(
  _prev: ResidentMaintenanceActionState,
  formData: FormData,
): Promise<ResidentMaintenanceActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const { apartmentId } = await getResidentApartmentContext(ctx);
  if (!apartmentId) return { status: 'error', message: 'Орон сууц холбогдоогүй байна' };

  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await requireApartmentAccess(apartmentId);

  try {
    const request = await createMaintenanceRequest({
      organization_id: ctx.user.organization_id,
      apartment_id: apartmentId,
      created_by: ctx.user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category as MaintenanceCategory,
      priority: parsed.data.priority as MaintenancePriority,
    });

    await createAuditLog({
      organization_id: ctx.user.organization_id,
      actor_id: ctx.user.id,
      action: 'MAINTENANCE_CREATED',
      entity_type: 'maintenance_request',
      entity_id: request.id,
      new_data: {
        title: request.title,
        category: request.category,
        priority: request.priority,
      },
    });

    revalidatePath('/resident/maintenance');
    revalidatePath('/resident');
    return { status: 'success', message: 'Засварын хүсэлт бүртгэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function addCommentAction(
  _prev: ResidentMaintenanceActionState,
  formData: FormData,
): Promise<ResidentMaintenanceActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const parsed = commentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const request = await getMaintenanceRequestById(parsed.data.request_id);
  if (!request) return { status: 'error', message: 'Хүсэлт олдсонгүй' };

  await requireApartmentAccess(request.apartment_id);

  try {
    await createMaintenanceComment({
      request_id: parsed.data.request_id,
      user_id: ctx.user.id,
      comment: parsed.data.comment,
    });

    revalidatePath('/resident/maintenance');
    return { status: 'success', message: 'Сэтгэгдэл нэмэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function closeMaintenanceAction(
  _prev: ResidentMaintenanceActionState,
  formData: FormData,
): Promise<ResidentMaintenanceActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const parsed = closeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: 'error', message: 'Мэдээлэл буруу байна' };
  }

  const request = await getMaintenanceRequestById(parsed.data.request_id);
  if (!request) return { status: 'error', message: 'Хүсэлт олдсонгүй' };

  await requireApartmentAccess(request.apartment_id);

  if (request.status === 'COMPLETED') {
    return { status: 'error', message: 'Дууссан хүсэлтийг хаах боломжгүй' };
  }

  if (request.status === 'CANCELLED') {
    return { status: 'error', message: 'Хүсэлт аль хэдийн хаагдсан байна' };
  }

  try {
    await updateMaintenanceRequest(request.id, { status: 'CANCELLED' });
    await createAuditLog({
      organization_id: request.organization_id,
      actor_id: ctx.user.id,
      action: 'MAINTENANCE_UPDATED',
      entity_type: 'maintenance_request',
      entity_id: request.id,
      old_data: { status: request.status },
      new_data: { status: 'CANCELLED', closed_by: 'resident' },
    });

    revalidatePath('/resident/maintenance');
    revalidatePath('/resident');
    return { status: 'success', message: 'Хүсэлт хаагдлаа' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}
