'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/permissions';
import {
  assertOrganizationAccess,
  getScopedOrganizationId,
  resolveOrganizationIdForCreate,
} from '@/lib/admin/org-scope';
import { getApartmentById } from '@/lib/queries/apartments';
import {
  assignResidentApartment,
  createResident,
  getResidentById,
  setResidentAsOwner,
  updateResident,
} from '@/lib/queries/residents';
import type { ResidentStatus } from '@/types';

export type ResidentActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const emptyToNull = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const residentSchema = z.object({
  apartment_id: z.string().uuid('Орон сууц сонгоно уу'),
  first_name: z.string().trim().min(1, 'Нэр оруулна уу').max(100),
  last_name: z.string().trim().min(1, 'Овог оруулна уу').max(100),
  phone: z.preprocess(emptyToNull, z.string().max(50).nullable().optional()),
  email: z.preprocess(
    emptyToNull,
    z.string().email('И-мэйл буруу байна').nullable().optional(),
  ),
  is_owner: z.preprocess(
    (value) => value === 'on' || value === 'true' || value === true,
    z.boolean().optional(),
  ),
});

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

async function assertApartmentInOrg(apartmentId: string, organizationId: string) {
  const apartment = await getApartmentById(apartmentId);
  if (!apartment || apartment.organization_id !== organizationId) {
    throw new Error('Орон сууц олдсонгүй');
  }
  return apartment;
}

export async function createResidentAction(
  _prev: ResidentActionState,
  formData: FormData,
): Promise<ResidentActionState> {
  const ctx = await requireAdminRole();
  const organizationId = resolveOrganizationIdForCreate(ctx);
  const parsed = residentSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await assertApartmentInOrg(parsed.data.apartment_id, organizationId);

    const resident = await createResident({
      organization_id: organizationId,
      apartment_id: parsed.data.apartment_id,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      is_owner: false,
      status: 'ACTIVE',
    });

    if (parsed.data.is_owner) {
      await setResidentAsOwner(resident.id, parsed.data.apartment_id);
    }

    revalidatePath('/admin/residents');
    revalidatePath('/admin/apartments');
    revalidatePath(`/admin/apartments/${parsed.data.apartment_id}`);
    return { status: 'success', message: 'Оршин суугч амжилттай бүртгэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function updateResidentAction(
  _prev: ResidentActionState,
  formData: FormData,
): Promise<ResidentActionState> {
  const ctx = await requireAdminRole();
  const residentId = String(formData.get('id') ?? '');
  if (!residentId) return { status: 'error', message: 'Оршин суугч олдсонгүй' };

  const existing = await getResidentById(residentId);
  if (!existing) return { status: 'error', message: 'Оршин суугч олдсонгүй' };
  assertOrganizationAccess(ctx, existing.organization_id);

  const parsed = residentSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await assertApartmentInOrg(parsed.data.apartment_id, existing.organization_id);

    if (parsed.data.apartment_id !== existing.apartment_id) {
      await assignResidentApartment(residentId, parsed.data.apartment_id);
    }

    await updateResident(residentId, {
      apartment_id: parsed.data.apartment_id,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      is_owner: parsed.data.is_owner ?? false,
    });

    if (parsed.data.is_owner) {
      await setResidentAsOwner(residentId, parsed.data.apartment_id);
    }

    revalidatePath('/admin/residents');
    revalidatePath('/admin/apartments');
    revalidatePath(`/admin/apartments/${parsed.data.apartment_id}`);
    return { status: 'success', message: 'Оршин суугч шинэчлэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function assignResidentApartmentAction(
  residentId: string,
  apartmentId: string,
): Promise<ResidentActionState> {
  const ctx = await requireAdminRole();
  const resident = await getResidentById(residentId);
  if (!resident) return { status: 'error', message: 'Оршин суугч олдсонгүй' };
  assertOrganizationAccess(ctx, resident.organization_id);
  await assertApartmentInOrg(apartmentId, resident.organization_id);
  await assignResidentApartment(residentId, apartmentId);
  revalidatePath('/admin/residents');
  revalidatePath('/admin/apartments');
  revalidatePath(`/admin/apartments/${apartmentId}`);
  return { status: 'success', message: 'Орон сууц холбогдлоо' };
}

export async function setResidentOwnerAction(
  residentId: string,
): Promise<ResidentActionState> {
  const ctx = await requireAdminRole();
  const resident = await getResidentById(residentId);
  if (!resident) return { status: 'error', message: 'Оршин суугч олдсонгүй' };
  assertOrganizationAccess(ctx, resident.organization_id);
  await setResidentAsOwner(residentId, resident.apartment_id);
  revalidatePath('/admin/residents');
  revalidatePath('/admin/apartments');
  revalidatePath(`/admin/apartments/${resident.apartment_id}`);
  return { status: 'success', message: 'Эзэмшигч болголоо' };
}

export async function setResidentStatusAction(
  residentId: string,
  status: ResidentStatus,
): Promise<ResidentActionState> {
  const ctx = await requireAdminRole();
  const resident = await getResidentById(residentId);
  if (!resident) return { status: 'error', message: 'Оршин суугч олдсонгүй' };
  assertOrganizationAccess(ctx, resident.organization_id);
  await updateResident(residentId, {
    status,
    is_owner: status === 'ACTIVE' ? resident.is_owner : false,
  });
  revalidatePath('/admin/residents');
  revalidatePath('/admin/apartments');
  revalidatePath(`/admin/apartments/${resident.apartment_id}`);
  return {
    status: 'success',
    message: status === 'ACTIVE' ? 'Оршин суугч идэвхжлээ' : 'Оршин суугч идэвхгүй боллоо',
  };
}

export async function deactivateResidentAction(residentId: string): Promise<ResidentActionState> {
  return setResidentStatusAction(residentId, 'INACTIVE');
}

export async function activateResidentAction(residentId: string): Promise<ResidentActionState> {
  return setResidentStatusAction(residentId, 'ACTIVE');
}

export async function deleteResidentAction(residentId: string): Promise<ResidentActionState> {
  const ctx = await requireAdminRole();
  const resident = await getResidentById(residentId);
  if (!resident) return { status: 'error', message: 'Оршин суугч олдсонгүй' };
  assertOrganizationAccess(ctx, resident.organization_id);

  if (resident.status === 'ACTIVE') {
    return {
      status: 'error',
      message: 'Идэвхтэй оршин суугчийг шууд устгах боломжгүй. Эхлээд идэвхгүй болгоно уу.',
    };
  }

  const { deleteResident } = await import('@/lib/queries/residents');
  const deleted = await deleteResident(residentId);
  if (!deleted) return { status: 'error', message: 'Устгахад алдаа гарлаа' };

  revalidatePath('/admin/residents');
  revalidatePath('/admin/apartments');
  revalidatePath(`/admin/apartments/${resident.apartment_id}`);
  return { status: 'success', message: 'Оршин суугч бүрмосон устгагдлаа' };
}

export async function listApartmentOptionsAction() {
  const ctx = await requireAdminRole();
  const orgId = getScopedOrganizationId(ctx) ?? ctx.user.organization_id;
  const { listApartmentsAdminView } = await import('@/lib/queries/apartments');
  const { data } = await listApartmentsAdminView(orgId, { limit: 500 });
  return data.map((apt) => ({
    id: apt.id,
    label: [apt.building_name, apt.tower, apt.apartment_number].filter(Boolean).join(' · '),
  }));
}
