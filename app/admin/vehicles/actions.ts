'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/permissions';
import {
  assertOrganizationAccess,
  resolveOrganizationIdForCreate,
} from '@/lib/admin/org-scope';
import { generateUniqueRfidNumber } from '@/lib/gate/generate-rfid';
import { recalculateVehicleAccess } from '@/lib/gate/vehicle-access-service';
import { getApartmentById } from '@/lib/queries/apartments';
import {
  createVehicle,
  getDefaultVehicleForApartment,
  getVehicleById,
  getVehicleByPlate,
  getVehicleByRfid,
  updateVehicle,
} from '@/lib/queries/vehicles';
import type { VehicleType } from '@/types';

export type VehicleActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const vehicleTypes = ['CAR', 'MOTORCYCLE', 'VAN', 'TRUCK', 'OTHER'] as const;

const emptyToNull = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const vehicleSchema = z.object({
  apartment_id: z.string().uuid('Орон сууц сонгоно уу'),
  plate_number: z.string().trim().min(1, 'Улсын дугаар оруулна уу').max(50),
  vehicle_type: z.enum(vehicleTypes),
  owner_name: z.preprocess(emptyToNull, z.string().max(255).nullable().optional()),
  rfid_number: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
});

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function revalidateVehiclePaths(apartmentId?: string) {
  revalidatePath('/admin/vehicles');
  revalidatePath('/admin/gate-access');
  revalidatePath('/resident/vehicle');
  revalidatePath('/resident');
  if (apartmentId) {
    revalidatePath(`/admin/apartments/${apartmentId}`);
  }
}

export async function createVehicleAction(
  _prev: VehicleActionState,
  formData: FormData,
): Promise<VehicleActionState> {
  const ctx = await requireAdminRole();
  const organizationId = resolveOrganizationIdForCreate(ctx);
  const parsed = vehicleSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const apartment = await getApartmentById(parsed.data.apartment_id);
  if (!apartment) return { status: 'error', message: 'Орон сууц олдсонгүй' };
  assertOrganizationAccess(ctx, apartment.organization_id);

  const existingDefault = await getDefaultVehicleForApartment(parsed.data.apartment_id);
  if (existingDefault) {
    return { status: 'error', message: 'Энэ орон сууцанд машин бүртгэлтэй байна. Эхлээд засах эсвэл идэвхгүй болгоно уу.' };
  }

  const duplicatePlate = await getVehicleByPlate(organizationId, parsed.data.plate_number);
  if (duplicatePlate) {
    return { status: 'error', message: 'Энэ улсын дугаар аль хэдийн бүртгэгдсэн байна' };
  }

  try {
    const rfidNumber =
      parsed.data.rfid_number?.trim() || (await generateUniqueRfidNumber(organizationId));

    if (parsed.data.rfid_number?.trim()) {
      const duplicateRfid = await getVehicleByRfid(organizationId, rfidNumber);
      if (duplicateRfid) {
        return { status: 'error', message: 'Энэ RFID дугаар аль хэдийн бүртгэгдсэн байна' };
      }
    }

    await createVehicle({
      organization_id: organizationId,
      apartment_id: parsed.data.apartment_id,
      plate_number: parsed.data.plate_number,
      vehicle_type: parsed.data.vehicle_type as VehicleType,
      owner_name: parsed.data.owner_name ?? null,
      rfid_number: rfidNumber,
      active: true,
      gate_access: true,
      access_started_at: new Date().toISOString(),
    });

    await recalculateVehicleAccess(parsed.data.apartment_id, {
      actorId: ctx.user.id,
      triggeredBy: 'admin-vehicle-create',
    });

    revalidateVehiclePaths(parsed.data.apartment_id);
    return {
      status: 'success',
      message: `Машин амжилттай бүртгэгдлээ (RFID: ${rfidNumber})`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function updateVehicleAction(
  _prev: VehicleActionState,
  formData: FormData,
): Promise<VehicleActionState> {
  const ctx = await requireAdminRole();
  const id = String(formData.get('id') ?? '');
  const parsed = vehicleSchema.safeParse(formToObject(formData));

  if (!id) return { status: 'error', message: 'Машин олдсонгүй' };
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await getVehicleById(id);
  if (!existing) return { status: 'error', message: 'Машин олдсонгүй' };
  assertOrganizationAccess(ctx, existing.organization_id);

  if (parsed.data.plate_number !== existing.plate_number) {
    const duplicatePlate = await getVehicleByPlate(existing.organization_id, parsed.data.plate_number);
    if (duplicatePlate && duplicatePlate.id !== id) {
      return { status: 'error', message: 'Энэ улсын дугаар аль хэдийн бүртгэгдсэн байна' };
    }
  }

  try {
    const rfidNumber =
      parsed.data.rfid_number?.trim() ||
      existing.rfid_number ||
      (await generateUniqueRfidNumber(existing.organization_id));

    await updateVehicle(id, {
      plate_number: parsed.data.plate_number,
      vehicle_type: parsed.data.vehicle_type as VehicleType,
      owner_name: parsed.data.owner_name ?? null,
      rfid_number: rfidNumber,
    });

    revalidateVehiclePaths(existing.apartment_id);
    return { status: 'success', message: 'Машин шинэчлэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function activateVehicleAction(vehicleId: string): Promise<VehicleActionState> {
  const ctx = await requireAdminRole();
  const vehicle = await getVehicleById(vehicleId);
  if (!vehicle) return { status: 'error', message: 'Машин олдсонгүй' };
  assertOrganizationAccess(ctx, vehicle.organization_id);

  try {
    await updateVehicle(vehicleId, { active: true });
    await recalculateVehicleAccess(vehicle.apartment_id, {
      actorId: ctx.user.id,
      triggeredBy: 'admin-vehicle-activate',
    });
    revalidateVehiclePaths(vehicle.apartment_id);
    return { status: 'success', message: 'Машин идэвхжлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function deactivateVehicleAction(vehicleId: string): Promise<VehicleActionState> {
  const ctx = await requireAdminRole();
  const vehicle = await getVehicleById(vehicleId);
  if (!vehicle) return { status: 'error', message: 'Машин олдсонгүй' };
  assertOrganizationAccess(ctx, vehicle.organization_id);

  try {
    const now = new Date().toISOString();
    await updateVehicle(vehicleId, {
      active: false,
      gate_access: false,
      disabled_at: now,
      disabled_reason: 'Админ идэвхгүй болгосон',
    });
    revalidateVehiclePaths(vehicle.apartment_id);
    return { status: 'success', message: 'Машин идэвхгүй боллоо' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function recalculateVehicleAccessAction(vehicleId: string): Promise<VehicleActionState> {
  const ctx = await requireAdminRole();
  const vehicle = await getVehicleById(vehicleId);
  if (!vehicle) return { status: 'error', message: 'Машин олдсонгүй' };
  assertOrganizationAccess(ctx, vehicle.organization_id);

  try {
    const result = await recalculateVehicleAccess(vehicle.apartment_id, {
      actorId: ctx.user.id,
      triggeredBy: 'admin-manual-recalculate',
    });
    revalidateVehiclePaths(vehicle.apartment_id);
    return {
      status: 'success',
      message: result?.changed
        ? `Зогсоолын эрх шинэчлэгдлээ (${result.gateAccess ? 'идэвхтэй' : 'идэвхгүй'})`
        : 'Зогсоолын эрх өөрчлөгдсөнийг шаардахгүй',
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}
