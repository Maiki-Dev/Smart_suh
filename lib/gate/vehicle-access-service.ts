import 'server-only';

import { query, type DbClient } from '@/lib/db';
import {
  countConsecutiveUnpaidMonths,
  GATE_DISABLED_REASON,
  GATE_RESTORED_MESSAGE,
  shouldDisableGateAccess,
} from '@/lib/gate/consecutive-unpaid';
import { createAuditLog } from '@/lib/queries/audit_logs';
import { createBarrierJob } from '@/lib/queries/barrier_jobs';
import { createGateAccessLog } from '@/lib/queries/gate_access_logs';
import { listInvoicesByApartment } from '@/lib/queries/invoices';
import { createNotification } from '@/lib/queries/notifications';
import {
  getDefaultVehicleForApartment,
  updateVehicle,
} from '@/lib/queries/vehicles';
import type { Vehicle } from '@/types';

export interface RecalculateVehicleAccessResult {
  apartmentId: string;
  vehicleId: string | null;
  consecutiveUnpaidMonths: number;
  gateAccess: boolean;
  changed: boolean;
  previousGateAccess: boolean | null;
}

async function notifyApartmentResidents(
  organizationId: string,
  apartmentId: string,
  title: string,
  message: string,
  type: 'GATE' | 'PAYMENT',
  client?: DbClient,
): Promise<void> {
  const { rows } = await query<{ user_id: string }>(
    `
      SELECT user_id
        FROM residents
       WHERE apartment_id = $1
         AND status = 'ACTIVE'
         AND user_id IS NOT NULL
    `,
    [apartmentId],
    client,
  );

  for (const row of rows) {
    await createNotification({
      organization_id: organizationId,
      user_id: row.user_id,
      type,
      title,
      message,
      client,
    });
  }
}

export async function recalculateVehicleAccess(
  apartmentId: string,
  opts?: {
    actorId?: string | null;
    triggeredBy?: string;
    client?: DbClient;
  },
): Promise<RecalculateVehicleAccessResult | null> {
  const client = opts?.client;
  const vehicle = await getDefaultVehicleForApartment(apartmentId, client);
  if (!vehicle) {
    return null;
  }

  const invoicesRes = await listInvoicesByApartment(apartmentId, { limit: 120 }, client);
  const consecutiveUnpaidMonths = countConsecutiveUnpaidMonths(invoicesRes.data, 'PARKING');
  const shouldDisable = shouldDisableGateAccess(consecutiveUnpaidMonths);
  const nextGateAccess = !shouldDisable;
  const previousGateAccess = vehicle.gate_access;

  if (previousGateAccess === nextGateAccess) {
    return {
      apartmentId,
      vehicleId: vehicle.id,
      consecutiveUnpaidMonths,
      gateAccess: nextGateAccess,
      changed: false,
      previousGateAccess,
    };
  }

  const now = new Date().toISOString();
  const updated = await updateVehicle(
    vehicle.id,
    nextGateAccess
      ? {
          gate_access: true,
          disabled_at: null,
          disabled_reason: null,
          access_started_at: vehicle.access_started_at ?? now,
        }
      : {
          gate_access: false,
          disabled_at: now,
          disabled_reason: GATE_DISABLED_REASON,
        },
    client,
  );

  if (!updated) {
    throw new Error('Машины зогсоолын эрх шинэчлэхэд алдаа гарлаа');
  }

  await createGateAccessLog({
    organization_id: vehicle.organization_id,
    vehicle_id: vehicle.id,
    apartment_id: apartmentId,
    action: nextGateAccess ? 'ENTER' : 'DENIED',
    reason: nextGateAccess ? GATE_RESTORED_MESSAGE : GATE_DISABLED_REASON,
    triggered_by: opts?.triggeredBy ?? 'vehicle-access-service',
    client,
  });

  await createBarrierJob({
    organization_id: vehicle.organization_id,
    vehicle_id: vehicle.id,
    action: nextGateAccess ? 'ENABLE_ACCESS' : 'DISABLE_ACCESS',
    payload: {
      apartment_id: apartmentId,
      plate_number: vehicle.plate_number,
      rfid_number: vehicle.rfid_number,
      consecutive_unpaid_months: consecutiveUnpaidMonths,
    },
    client,
  });

  await notifyApartmentResidents(
    vehicle.organization_id,
    apartmentId,
    nextGateAccess ? 'Зогсоолын эрх сэргээлээ' : 'Зогсоолын эрх хаагдлаа',
    nextGateAccess ? GATE_RESTORED_MESSAGE : GATE_DISABLED_REASON,
    'GATE',
    client,
  );

  await createAuditLog({
    organization_id: vehicle.organization_id,
    actor_id: opts?.actorId ?? null,
    action: nextGateAccess ? 'VEHICLE_ACCESS_ENABLED' : 'VEHICLE_ACCESS_DISABLED',
    entity_type: 'vehicle',
    entity_id: vehicle.id,
    old_data: {
      gate_access: previousGateAccess,
      consecutive_unpaid_months: consecutiveUnpaidMonths,
    },
    new_data: {
      gate_access: nextGateAccess,
      disabled_reason: nextGateAccess ? null : GATE_DISABLED_REASON,
      consecutive_unpaid_months: consecutiveUnpaidMonths,
    },
    client,
  });

  return {
    apartmentId,
    vehicleId: vehicle.id,
    consecutiveUnpaidMonths,
    gateAccess: nextGateAccess,
    changed: true,
    previousGateAccess,
  };
}

export async function getVehicleAccessSummary(
  apartmentId: string,
  client?: DbClient,
): Promise<{
  vehicle: Vehicle | null;
  consecutiveUnpaidMonths: number;
  gateAccess: boolean;
  disabledReason: string | null;
}> {
  const vehicle = await getDefaultVehicleForApartment(apartmentId, client);
  const invoicesRes = await listInvoicesByApartment(apartmentId, { limit: 120 }, client);
  const consecutiveUnpaidMonths = countConsecutiveUnpaidMonths(invoicesRes.data, 'PARKING');

  return {
    vehicle,
    consecutiveUnpaidMonths,
    gateAccess: vehicle?.gate_access ?? !shouldDisableGateAccess(consecutiveUnpaidMonths),
    disabledReason: vehicle?.disabled_reason ?? (shouldDisableGateAccess(consecutiveUnpaidMonths) ? GATE_DISABLED_REASON : null),
  };
}
