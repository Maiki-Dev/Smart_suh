import 'server-only';

import { createAuditLog } from '@/lib/queries/audit_logs';
import {
  createMaintenanceComment,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
} from '@/lib/queries/maintenance';
import { createNotification } from '@/lib/queries/notifications';
import { query, type DbClient } from '@/lib/db';
import type { MaintenancePriority, MaintenanceStatus } from '@/types';
import {
  maintenancePriorityLabel,
  maintenanceStatusLabel,
} from '@/lib/admin/format';

export async function notifyApartmentResidents(
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

export async function notifyMaintenanceStaff(
  organizationId: string,
  title: string,
  message: string,
  options?: { userIds?: string[]; client?: DbClient },
): Promise<void> {
  const client = options?.client;
  const userIds = options?.userIds;

  if (userIds?.length) {
    for (const userId of userIds) {
      await createNotification({
        organization_id: organizationId,
        user_id: userId,
        type: 'MAINTENANCE',
        title,
        message,
        client,
      });
    }
    return;
  }

  const { rows } = await query<{ id: string }>(
    `
      SELECT id FROM users
       WHERE organization_id = $1
         AND role IN ('HOA_ADMIN', 'OPERATOR')
         AND status = 'ACTIVE'
    `,
    [organizationId],
    client,
  );

  for (const row of rows) {
    await createNotification({
      organization_id: organizationId,
      user_id: row.id,
      type: 'MAINTENANCE',
      title,
      message,
      client,
    });
  }
}

export async function applyMaintenanceUpdate(input: {
  requestId: string;
  actorId: string;
  organizationId: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  assignedTo?: string | null;
  comment?: string | null;
  client?: DbClient;
}) {
  const existing = await getMaintenanceRequestById(input.requestId, input.client);
  if (!existing) throw new Error('Асуудал олдсонгүй');

  const statusChanged = input.status !== existing.status;
  const priorityChanged = input.priority !== existing.priority;
  const assigneeChanged =
    input.assignedTo !== undefined && input.assignedTo !== existing.assigned_to;
  const hasComment = !!input.comment?.trim();

  if (!statusChanged && !priorityChanged && !assigneeChanged && !hasComment) {
    return existing;
  }

  const updated = await updateMaintenanceRequest(
    input.requestId,
    {
      status: input.status,
      priority: input.priority,
      assigned_to: input.assignedTo !== undefined ? input.assignedTo : existing.assigned_to,
    },
    input.client,
  );
  if (!updated) throw new Error('Асуудал шинэчлэхэд алдаа гарлаа');

  if (hasComment) {
    await createMaintenanceComment({
      request_id: input.requestId,
      user_id: input.actorId,
      comment: input.comment!.trim(),
      client: input.client,
    });
  }

  if (assigneeChanged) {
    await createAuditLog({
      organization_id: input.organizationId,
      actor_id: input.actorId,
      action: 'MAINTENANCE_ASSIGNED',
      entity_type: 'maintenance_request',
      entity_id: input.requestId,
      old_data: { assigned_to: existing.assigned_to },
      new_data: { assigned_to: input.assignedTo },
      client: input.client,
    });

    if (input.assignedTo) {
      await createNotification({
        organization_id: input.organizationId,
        user_id: input.assignedTo,
        type: 'MAINTENANCE',
        title: 'Шинэ засварын даалгавар',
        message: `"${existing.title}" хүсэлт танд хариуцуулахаар томилогдлоо.`,
        client: input.client,
      });
    }
  }

  if (statusChanged || priorityChanged) {
    await createAuditLog({
      organization_id: input.organizationId,
      actor_id: input.actorId,
      action: 'MAINTENANCE_UPDATED',
      entity_type: 'maintenance_request',
      entity_id: input.requestId,
      old_data: {
        status: existing.status,
        priority: existing.priority,
      },
      new_data: {
        status: input.status,
        priority: input.priority,
      },
      client: input.client,
    });
  }

  if (statusChanged) {
    await notifyApartmentResidents(
      input.organizationId,
      existing.apartment_id,
      'Засварын төлөв шинэчлэгдлээ',
      `"${existing.title}" — ${maintenanceStatusLabel(input.status)}`,
      input.client,
    );
  } else if (hasComment) {
    await notifyApartmentResidents(
      input.organizationId,
      existing.apartment_id,
      'Засварын хүсэлтэд тайлбар нэмэгдлээ',
      `"${existing.title}" хүсэлтэд админ тайлбар үлдээлээ.`,
      input.client,
    );
  } else if (priorityChanged) {
    await notifyApartmentResidents(
      input.organizationId,
      existing.apartment_id,
      'Засварын түвшин шинэчлэгдлээ',
      `"${existing.title}" — ${maintenancePriorityLabel(input.priority)}`,
      input.client,
    );
  }

  return updated;
}

/** @deprecated Use applyMaintenanceUpdate */
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

  return applyMaintenanceUpdate({
    requestId: input.requestId,
    actorId: input.actorId,
    organizationId: input.organizationId,
    status: input.status,
    priority: existing.priority,
    assignedTo: input.assignedTo,
    comment: input.comment,
    client: input.client,
  });
}
