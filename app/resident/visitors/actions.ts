'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole, requireApartmentAccess } from '@/lib/permissions';
import { getResidentApartmentContext } from '@/lib/resident/context';
import { createVisitorPassWithQr } from '@/lib/visitors/visitor-service';
import { createAuditLog } from '@/lib/queries/audit_logs';
import { createNotification } from '@/lib/queries/notifications';
import { getVisitorPassById, updateVisitorPassStatus } from '@/lib/queries/visitors';

export type ResidentVisitorActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const createSchema = z
  .object({
    visitor_name: z.string().trim().min(1, 'Зочны нэр заавал').max(255),
    phone: z.string().trim().max(50).optional().nullable(),
    plate_number: z.string().trim().max(50).optional().nullable(),
    valid_from: z.string().min(1, 'Эхлэх хугацаа заавал'),
    valid_until: z.string().min(1, 'Дуусах хугацаа заавал'),
  })
  .refine(
    (data) => new Date(data.valid_until) > new Date(data.valid_from),
    { message: 'Дуусах хугацаа эхлэхээс хойш байх ёстой', path: ['valid_until'] },
  );

const cancelSchema = z.object({
  id: z.string().uuid(),
});

export async function createVisitorPassAction(
  _prev: ResidentVisitorActionState,
  formData: FormData,
): Promise<ResidentVisitorActionState> {
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
    const { pass } = await createVisitorPassWithQr({
      organization_id: ctx.user.organization_id,
      apartment_id: apartmentId,
      created_by: ctx.user.id,
      visitor_name: parsed.data.visitor_name,
      phone: parsed.data.phone || null,
      plate_number: parsed.data.plate_number || null,
      valid_from: parsed.data.valid_from,
      valid_until: parsed.data.valid_until,
    });

    await createNotification({
      organization_id: ctx.user.organization_id,
      user_id: ctx.user.id,
      type: 'SYSTEM',
      title: 'Зочны эрх үүслээ',
      message: `${pass.visitor_name} зочны эрх амжилттай үүслээ.`,
    });

    await createAuditLog({
      organization_id: ctx.user.organization_id,
      actor_id: ctx.user.id,
      action: 'VISITOR_PASS_CREATED',
      entity_type: 'visitor_pass',
      entity_id: pass.id,
      new_data: {
        visitor_name: pass.visitor_name,
        apartment_id: apartmentId,
        status: pass.status,
      },
    });

    revalidatePath('/resident/visitors');
    revalidatePath('/resident');
    return { status: 'success', message: 'Зочны эрх амжилттай үүслээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function cancelVisitorPassAction(
  _prev: ResidentVisitorActionState,
  formData: FormData,
): Promise<ResidentVisitorActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const parsed = cancelSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: 'error', message: 'Мэдээлэл буруу байна' };
  }

  const pass = await getVisitorPassById(parsed.data.id);
  if (!pass) return { status: 'error', message: 'Зочны эрх олдсонгүй' };

  await requireApartmentAccess(pass.apartment_id);

  if (pass.status !== 'ACTIVE') {
    return { status: 'error', message: 'Зөвхөн идэвхтэй эрхийг цуцлах боломжтой' };
  }

  try {
    await updateVisitorPassStatus(pass.id, 'CANCELLED');
    await createAuditLog({
      organization_id: pass.organization_id,
      actor_id: ctx.user.id,
      action: 'VISITOR_PASS_CANCELLED',
      entity_type: 'visitor_pass',
      entity_id: pass.id,
      old_data: { status: 'ACTIVE' },
      new_data: { status: 'CANCELLED' },
    });

    revalidatePath('/resident/visitors');
    revalidatePath('/resident');
    return { status: 'success', message: 'Зочны эрх цуцлагдлаа' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}
