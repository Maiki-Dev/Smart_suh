'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/permissions';
import { recalculateVehicleAccess } from '@/lib/gate/vehicle-access-service';
import { getVehicleById, updateVehicle } from '@/lib/queries/vehicles';
import { getApartmentIdByResidentUser } from '@/lib/queries/residents';
import type { VehicleType } from '@/types';

export type ResidentVehicleActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const vehicleTypes = ['CAR', 'MOTORCYCLE', 'VAN', 'TRUCK', 'OTHER'] as const;

const updateSchema = z.object({
  id: z.string().uuid(),
  plate_number: z.string().trim().min(1).max(50),
  vehicle_type: z.enum(vehicleTypes),
  owner_name: z.string().trim().max(255).optional().nullable(),
  rfid_number: z.string().trim().max(100).optional().nullable(),
});

async function getResidentApartmentId(userId: string, organizationId: string) {
  return getApartmentIdByResidentUser(organizationId, userId);
}

export async function updateResidentVehicleAction(
  _prev: ResidentVehicleActionState,
  formData: FormData,
): Promise<ResidentVehicleActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const aptId = await getResidentApartmentId(ctx.user.id, ctx.user.organization_id);
  if (!aptId) return { status: 'error', message: 'Орон сууц холбогдоогүй байна' };

  const vehicle = await getVehicleById(parsed.data.id);
  if (!vehicle || vehicle.apartment_id !== aptId) {
    return { status: 'error', message: 'Машин олдсонгүй' };
  }

  try {
    await updateVehicle(vehicle.id, {
      plate_number: parsed.data.plate_number,
      vehicle_type: parsed.data.vehicle_type as VehicleType,
      owner_name: parsed.data.owner_name || null,
      rfid_number: parsed.data.rfid_number || null,
    });

    revalidatePath('/resident/vehicle');
    revalidatePath('/resident');
    return { status: 'success', message: 'Машины мэдээлэл шинэчлэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function refreshResidentGateAccessAction(): Promise<ResidentVehicleActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const aptId = await getResidentApartmentId(ctx.user.id, ctx.user.organization_id);
  if (!aptId) return { status: 'error', message: 'Орон сууц холбогдоогүй байна' };

  try {
    const result = await recalculateVehicleAccess(aptId, {
      actorId: ctx.user.id,
      triggeredBy: 'resident-refresh',
    });
    revalidatePath('/resident/vehicle');
    revalidatePath('/resident');
    return {
      status: 'success',
      message: result?.gateAccess
        ? 'Зогсоолын эрх идэвхтэй байна'
        : 'Зогсоолын эрх идэвхгүй байна',
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}
