import 'server-only';

import { createAuditLog } from '@/lib/queries/audit_logs';
import {
  createMaintenanceComment,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
} from '@/lib/queries/maintenance';
import { createNotification } from '@/lib/queries/notifications';
import { query, type DbClient } from '@/lib/db';
import type { MaintenanceStatus } from '@/types';
import { maintenanceStatusLabel } from '@/lib/admin/format';

async function notifyApartmentResidents(
  organizationId: string,
  apartmentId: string,
  title: string,
  message: string,
  client?: DbClient,
): Promise<void> {
  const { rows } = await query<{ user_id: string }>(
    `
      SELECT user_id FROM residents
       WHERE apartment_id = $1 AND status = 'ACTIVE' AND user_id IS NOT NULL
    `,
    [apartmentId],
    client,
  );

  for (const row of rows) {
    await createNotification({
      organization_id: organizationId,
      user_id: row.user_id,
      type: 'MAINTENANCE',
      title,
      message,
      client,
    });
  }
}

export async function updateMaintenanceStatus(input: {
  requestId: string;
  status: MaintenanceStatus;
  actorId: string;
  organizationId: string;
  assignedTo?: string | null;
  comment?: string | null;
  client?: DbClient;
}) {
  const existing = await getMaintenanceRequestById(input.requestId, input.client);
  if (!existing) throw new Error('Асуудал олдсонгүй');

  const updated = await updateMaintenanceRequest(
    input.requestId,
    { status: input.status },
    input.client,
  );
  if (!updated) throw new Error('Асуудал шинэчлэхэд алдаа гарлаа');

  if (input.comment?.trim()) {
    await createMaintenanceComment({
      request_id: input.requestId,
      user_id: input.actorId,
      comment: input.comment.trim(),
      client: input.client,
    });
  }

  if (input.assignedTo) {
    await createAuditLog({
      organization_id: input.organizationId,
      actor_id: input.actorId,
      action: 'MAINTENANCE_ASSIGNED',
      entity_type: 'maintenance_request',
      entity_id: input.requestId,
      old_data: { assigned_to: null },
      new_data: { assigned_to: input.assignedTo },
      client: input.client,
    });
  }

  await createAuditLog({
    organization_id: input.organizationId,
    actor_id: input.actorId,
    action: 'MAINTENANCE_UPDATED',
    entity_type: 'maintenance_request',
    entity_id: input.requestId,
    old_data: { status: existing.status },
    new_data: { status: input.status },
    client: input.client,
  });

  const title = 'Засварын төлөв шинэчлэгдлээ';
  const message = `Таны бүртгэсэн "${existing.title}" асуудлын төлөв: ${maintenanceStatusLabel(input.status)}`;
  await notifyApartmentResidents(
    input.organizationId,
    existing.apartment_id,
    title,
    message,
    input.client,
  );

  return updated;
}
