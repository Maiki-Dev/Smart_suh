'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/permissions';
import {
  assertOrganizationAccess,
  getScopedOrganizationId,
  resolveOrganizationIdForCreate,
} from '@/lib/admin/org-scope';
import { getBuildingById } from '@/lib/queries/buildings';
import {
  createApartment,
  getApartmentById,
  getApartmentByNumber,
  updateApartment,
} from '@/lib/queries/apartments';
import type { ApartmentStatus } from '@/types';

export type ApartmentActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const emptyToNull = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const apartmentSchema = z.object({
  building_id: z.string().uuid('Барилга сонгоно уу'),
  tower: z.preprocess(emptyToNull, z.string().max(50).nullable().optional()),
  entrance: z.preprocess(emptyToNull, z.string().max(50).nullable().optional()),
  floor: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    z.number().int().nullable().optional(),
  ),
  apartment_number: z.string().trim().min(1, 'Орон сууцны дугаар оруулна уу').max(50),
  area_m2: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    z.number().positive('Талбай 0-ээс их байх ёстой').nullable().optional(),
  ),
  monthly_fee: z.preprocess(
    (value) => Number(value ?? 0),
    z.number().min(0, 'Сарын төлбөр сөрөг байж болохгүй'),
  ),
});

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

async function validateBuildingAccess(buildingId: string, organizationId: string) {
  const building = await getBuildingById(buildingId);
  if (!building || building.organization_id !== organizationId) {
    throw new Error('Барилга олдсонгүй');
  }
  return building;
}

export async function createApartmentAction(
  _prev: ApartmentActionState,
  formData: FormData,
): Promise<ApartmentActionState> {
  const ctx = await requireAdminRole();
  const organizationId = resolveOrganizationIdForCreate(ctx);
  const parsed = apartmentSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await validateBuildingAccess(parsed.data.building_id, organizationId);
    const duplicate = await getApartmentByNumber(
      parsed.data.building_id,
      parsed.data.apartment_number,
    );
    if (duplicate) {
      return {
        status: 'error',
        message: 'Энэ барилгад ийм дугаартай орон сууц аль хэдийн бүртгэгдсэн байна',
        fieldErrors: { apartment_number: ['Давхардсан дугаар'] },
      };
    }

    await createApartment({
      organization_id: organizationId,
      building_id: parsed.data.building_id,
      tower: parsed.data.tower ?? null,
      entrance: parsed.data.entrance ?? null,
      floor: parsed.data.floor ?? null,
      apartment_number: parsed.data.apartment_number,
      area_m2: parsed.data.area_m2 ?? null,
      monthly_fee: parsed.data.monthly_fee,
      status: 'OCCUPIED',
    });

    revalidatePath('/admin/apartments');
    return { status: 'success', message: 'Орон сууц амжилттай бүртгэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function updateApartmentAction(
  _prev: ApartmentActionState,
  formData: FormData,
): Promise<ApartmentActionState> {
  const ctx = await requireAdminRole();
  const apartmentId = String(formData.get('id') ?? '');
  if (!apartmentId) return { status: 'error', message: 'Орон сууц олдсонгүй' };

  const existing = await getApartmentById(apartmentId);
  if (!existing) return { status: 'error', message: 'Орон сууц олдсонгүй' };
  assertOrganizationAccess(ctx, existing.organization_id);

  const parsed = apartmentSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await validateBuildingAccess(parsed.data.building_id, existing.organization_id);
    const duplicate = await getApartmentByNumber(
      parsed.data.building_id,
      parsed.data.apartment_number,
    );
    if (duplicate && duplicate.id !== apartmentId) {
      return {
        status: 'error',
        message: 'Энэ барилгад ийм дугаартай орон сууц аль хэдийн бүртгэгдсэн байна',
        fieldErrors: { apartment_number: ['Давхардсан дугаар'] },
      };
    }

    await updateApartment(apartmentId, {
      building_id: parsed.data.building_id,
      tower: parsed.data.tower ?? null,
      entrance: parsed.data.entrance ?? null,
      floor: parsed.data.floor ?? null,
      apartment_number: parsed.data.apartment_number,
      area_m2: parsed.data.area_m2 ?? null,
      monthly_fee: parsed.data.monthly_fee,
    });

    revalidatePath('/admin/apartments');
    revalidatePath(`/admin/apartments/${apartmentId}`);
    return { status: 'success', message: 'Орон сууц шинэчлэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function setApartmentStatusAction(
  apartmentId: string,
  status: ApartmentStatus,
): Promise<ApartmentActionState> {
  const ctx = await requireAdminRole();
  const existing = await getApartmentById(apartmentId);
  if (!existing) return { status: 'error', message: 'Орон сууц олдсонгүй' };
  assertOrganizationAccess(ctx, existing.organization_id);

  await updateApartment(apartmentId, { status });
  revalidatePath('/admin/apartments');
  revalidatePath(`/admin/apartments/${apartmentId}`);
  return {
    status: 'success',
    message: status === 'VACANT' ? 'Орон сууц идэвхгүй боллоо' : 'Орон сууц идэвхжлээ',
  };
}

export async function deactivateApartmentAction(apartmentId: string): Promise<ApartmentActionState> {
  return setApartmentStatusAction(apartmentId, 'VACANT');
}

export async function activateApartmentAction(apartmentId: string): Promise<ApartmentActionState> {
  return setApartmentStatusAction(apartmentId, 'OCCUPIED');
}

export async function getApartmentsForSelectAction() {
  const ctx = await requireAdminRole();
  const orgId = getScopedOrganizationId(ctx) ?? ctx.user.organization_id;
  const { listApartmentsByOrganization } = await import('@/lib/queries/apartments');
  const result = await listApartmentsByOrganization(orgId, { limit: 500, orderBy: 'apartment_number' });
  return result.data.map((apt) => ({
    id: apt.id,
    label: [apt.tower, apt.apartment_number].filter(Boolean).join(' · '),
  }));
}
