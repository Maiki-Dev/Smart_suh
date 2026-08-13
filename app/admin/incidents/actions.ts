'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess, getScopedOrganizationId } from '@/lib/admin/org-scope';
import {
  getIncidentById,
  updateIncident,
  addTimelineEvent,
  createIncident,
  nextIncidentNumber,
  linkIssueToIncident,
} from '@/lib/queries/incidents';
import { createAuditLog } from '@/lib/queries/audit_logs';
import { notifyMaintenanceStaff, notifyApartmentResidents } from '@/lib/maintenance/maintenance-service';
import { query } from '@/lib/db';
import type { IncidentIssueType, IncidentStatus } from '@/lib/incidents/types';
import type { MaintenancePriority } from '@/types';
import { incidentTitleFromType } from '@/lib/incidents/labels';

export type IncidentActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

function revalidateIncidents(id?: string) {
  revalidatePath('/admin/incidents');
  revalidatePath('/admin/maintenance');
  revalidatePath('/admin');
  if (id) revalidatePath(`/admin/incidents/${id}`);
}

export async function confirmIncidentAction(incidentId: string): Promise<IncidentActionState> {
  const ctx = await requireAdminRole();
  const incident = await getIncidentById(incidentId);
  if (!incident) return { status: 'error', message: 'Incident олдсонгүй' };
  assertOrganizationAccess(ctx, incident.organization_id);

  await updateIncident(incidentId, {
    status: 'CONFIRMED',
    confirmed_at: new Date().toISOString(),
  });
  await addTimelineEvent({
    incident_id: incidentId,
    event_type: 'INCIDENT_CONFIRMED',
    description: 'Incident баталгаажлаа',
    actor_id: ctx.user.id,
  });
  await createAuditLog({
    organization_id: incident.organization_id,
    actor_id: ctx.user.id,
    action: 'INCIDENT_CONFIRMED',
    entity_type: 'building_incident',
    entity_id: incidentId,
  });

  const { rows: affected } = await query<{ apartment_id: string }>(
    `SELECT DISTINCT apartment_id FROM incident_affected_areas WHERE incident_id = $1 AND apartment_id IS NOT NULL`,
    [incidentId],
  );
  for (const row of affected) {
    await notifyApartmentResidents(
      incident.organization_id,
      row.apartment_id,
      '🚨 Building Incident',
      `${incident.title} — Засварын баг ажиллаж байна`,
    );
  }

  revalidateIncidents(incidentId);
  return { status: 'success', message: 'Incident баталгаажлаа' };
}

export async function resolveIncidentAction(incidentId: string): Promise<IncidentActionState> {
  const ctx = await requireAdminRole();
  const incident = await getIncidentById(incidentId);
  if (!incident) return { status: 'error', message: 'Incident олдсонгүй' };
  assertOrganizationAccess(ctx, incident.organization_id);

  await updateIncident(incidentId, {
    status: 'RESOLVED',
    resolved_at: new Date().toISOString(),
  });
  await addTimelineEvent({
    incident_id: incidentId,
    event_type: 'INCIDENT_RESOLVED',
    description: 'Incident шийдэгдлээ',
    actor_id: ctx.user.id,
  });
  await createAuditLog({
    organization_id: incident.organization_id,
    actor_id: ctx.user.id,
    action: 'INCIDENT_RESOLVED',
    entity_type: 'building_incident',
    entity_id: incidentId,
  });

  revalidateIncidents(incidentId);
  return { status: 'success', message: 'Incident шийдэгдлээ' };
}

export async function falsePositiveIncidentAction(incidentId: string): Promise<IncidentActionState> {
  const ctx = await requireAdminRole();
  const incident = await getIncidentById(incidentId);
  if (!incident) return { status: 'error', message: 'Incident олдсонгүй' };
  assertOrganizationAccess(ctx, incident.organization_id);

  await updateIncident(incidentId, { status: 'FALSE_POSITIVE' });
  await query(`UPDATE maintenance_requests SET incident_id = NULL WHERE incident_id = $1`, [incidentId]);
  await addTimelineEvent({
    incident_id: incidentId,
    event_type: 'FALSE_POSITIVE',
    description: 'Incident буруу илрүүлэг гэж тэмдэглэв',
    actor_id: ctx.user.id,
  });

  revalidateIncidents(incidentId);
  return { status: 'success', message: 'False positive болголоо' };
}

export async function updateIncidentPriorityAction(
  incidentId: string,
  priority: MaintenancePriority,
): Promise<IncidentActionState> {
  const ctx = await requireAdminRole();
  const incident = await getIncidentById(incidentId);
  if (!incident) return { status: 'error', message: 'Incident олдсонгүй' };
  assertOrganizationAccess(ctx, incident.organization_id);

  await updateIncident(incidentId, { priority });
  await addTimelineEvent({
    incident_id: incidentId,
    event_type: 'PRIORITY_CHANGED',
    description: `Priority: ${priority}`,
    actor_id: ctx.user.id,
  });
  revalidateIncidents(incidentId);
  return { status: 'success', message: 'Priority шинэчлэгдлээ' };
}

export async function assignIncidentAction(
  incidentId: string,
  assigneeId: string,
): Promise<IncidentActionState> {
  const ctx = await requireAdminRole();
  const incident = await getIncidentById(incidentId);
  if (!incident) return { status: 'error', message: 'Incident олдсонгүй' };
  assertOrganizationAccess(ctx, incident.organization_id);

  await updateIncident(incidentId, {
    assigned_to: assigneeId || null,
    status: incident.status === 'DETECTED' ? 'IN_PROGRESS' : incident.status,
  });
  await addTimelineEvent({
    incident_id: incidentId,
    event_type: 'TEAM_ASSIGNED',
    description: 'Maintenance team assigned',
    actor_id: ctx.user.id,
    metadata: { assignee_id: assigneeId },
  });

  if (assigneeId) {
    await notifyMaintenanceStaff(
      incident.organization_id,
      'Incident томилогдлоо',
      `${incident.incident_number}: ${incident.title}`,
      { userIds: [assigneeId] },
    );
  }

  revalidateIncidents(incidentId);
  return { status: 'success', message: 'Team томилогдлоо' };
}

export async function createManualIncidentAction(input: {
  organizationId: string;
  buildingId: string | null;
  category: IncidentIssueType;
  description?: string;
}): Promise<IncidentActionState & { incidentId?: string }> {
  const ctx = await requireAdminRole();
  assertOrganizationAccess(ctx, input.organizationId);

  const incidentNumber = await nextIncidentNumber(input.organizationId);
  const incident = await createIncident({
    organization_id: input.organizationId,
    building_id: input.buildingId,
    incident_number: incidentNumber,
    title: incidentTitleFromType(input.category),
    category: input.category,
    priority: 'HIGH',
    status: 'DETECTED',
    description: input.description ?? null,
    detection_source: 'MANUAL',
    confidence_score: 100,
    affected_area: {},
    report_count: 0,
    affected_apartment_count: 0,
    floor_min: null,
    floor_max: null,
    assigned_to: null,
    detected_at: new Date().toISOString(),
    confirmed_at: null,
    resolved_at: null,
    created_by: ctx.user.id,
  });

  revalidateIncidents(incident.id);
  return { status: 'success', message: 'Incident үүслээ', incidentId: incident.id };
}

export async function linkRequestToIncidentAction(
  incidentId: string,
  requestId: string,
): Promise<IncidentActionState> {
  const ctx = await requireAdminRole();
  const incident = await getIncidentById(incidentId);
  if (!incident) return { status: 'error', message: 'Incident олдсонгүй' };
  assertOrganizationAccess(ctx, incident.organization_id);

  await linkIssueToIncident({
    incident_id: incidentId,
    issue_id: requestId,
    similarity_score: 100,
    linked_by: 'MANUAL',
  });

  await addTimelineEvent({
    incident_id: incidentId,
    event_type: 'ISSUE_LINKED',
    description: `Manual link: request ${requestId}`,
    actor_id: ctx.user.id,
  });

  revalidateIncidents(incidentId);
  return { status: 'success', message: 'Issue холбогдлоо' };
}
