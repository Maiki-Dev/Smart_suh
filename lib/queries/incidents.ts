import 'server-only';

import { query, withTransaction, type DbClient } from '@/lib/db';
import type {
  BuildingIncident,
  IncidentAdminRow,
  IncidentDetectionSource,
  IncidentIssueType,
  IncidentLocationMatch,
  IncidentStatus,
} from '@/lib/incidents/types';
import type { MaintenancePriority, MaintenanceRequest } from '@/types';

export type { BuildingIncident, IncidentAdminRow } from '@/lib/incidents/types';

const INCIDENT_SELECT = `
  SELECT id, organization_id, building_id, incident_number, title, category, priority, status,
         description, detection_source, confidence_score, affected_area,
         report_count, affected_apartment_count, floor_min, floor_max,
         assigned_to, detected_at, confirmed_at, resolved_at, created_by, created_at, updated_at
    FROM building_incidents
`;

function parseIncident(row: Record<string, unknown>): BuildingIncident {
  return {
    ...row,
    confidence_score: parseFloat(String(row.confidence_score)),
    report_count: Number(row.report_count),
    affected_apartment_count: Number(row.affected_apartment_count),
    floor_min: row.floor_min != null ? Number(row.floor_min) : null,
    floor_max: row.floor_max != null ? Number(row.floor_max) : null,
    affected_area: (row.affected_area ?? {}) as Record<string, unknown>,
  } as BuildingIncident;
}

export async function nextIncidentNumber(
  organizationId: string,
  client?: DbClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count FROM building_incidents
       WHERE organization_id = $1
         AND EXTRACT(YEAR FROM created_at) = $2
    `,
    [organizationId, year],
    client,
  );
  const seq = String(parseInt(rows[0]?.count ?? '0', 10) + 1).padStart(3, '0');
  return `INC-${year}-${seq}`;
}

export async function getIncidentById(
  id: string,
  client?: DbClient,
): Promise<BuildingIncident | null> {
  const { rows } = await query(`${INCIDENT_SELECT} WHERE id = $1`, [id], client);
  return rows[0] ? parseIncident(rows[0]) : null;
}

export async function createIncident(
  input: Omit<BuildingIncident, 'id' | 'created_at' | 'updated_at' | 'confidence_score' | 'report_count' | 'affected_apartment_count'> & {
    confidence_score?: number;
    report_count?: number;
    affected_apartment_count?: number;
  },
  client?: DbClient,
): Promise<BuildingIncident> {
  const { rows } = await query(
    `
      INSERT INTO building_incidents (
        organization_id, building_id, incident_number, title, category, priority, status,
        description, detection_source, confidence_score, affected_area,
        report_count, affected_apartment_count, floor_min, floor_max,
        assigned_to, detected_at, confirmed_at, resolved_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5::incident_issue_type, $6::maint_priority, $7::incident_status,
        $8, $9::incident_detection_source, $10, $11::jsonb,
        $12, $13, $14, $15, $16, COALESCE($17::timestamptz, NOW()), $18, $19, $20
      )
      RETURNING *
    `,
    [
      input.organization_id,
      input.building_id,
      input.incident_number,
      input.title,
      input.category,
      input.priority,
      input.status,
      input.description,
      input.detection_source,
      input.confidence_score ?? 0,
      JSON.stringify(input.affected_area ?? {}),
      input.report_count ?? 0,
      input.affected_apartment_count ?? 0,
      input.floor_min,
      input.floor_max,
      input.assigned_to,
      input.detected_at,
      input.confirmed_at,
      input.resolved_at,
      input.created_by,
    ],
    client,
  );
  return parseIncident(rows[0]);
}

export async function updateIncident(
  id: string,
  patch: Partial<Pick<BuildingIncident, 'status' | 'priority' | 'assigned_to' | 'confidence_score' | 'report_count' | 'affected_apartment_count' | 'floor_min' | 'floor_max' | 'confirmed_at' | 'resolved_at' | 'description'>>,
  client?: DbClient,
): Promise<BuildingIncident | null> {
  const fields: string[] = [];
  const params: unknown[] = [id];
  let idx = 2;

  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) continue;
    fields.push(`${key} = $${idx++}`);
    params.push(val);
  }
  if (fields.length === 0) return getIncidentById(id, client);

  const { rows } = await query(
    `UPDATE building_incidents SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    params,
    client,
  );
  return rows[0] ? parseIncident(rows[0]) : null;
}

export async function linkIssueToIncident(input: {
  incident_id: string;
  issue_id: string;
  similarity_score: number;
  location_match?: IncidentLocationMatch | null;
  linked_by?: string;
}, client?: DbClient): Promise<void> {
  await query(
    `
      INSERT INTO incident_issues (incident_id, issue_id, similarity_score, location_match, linked_by)
      VALUES ($1, $2, $3, $4::incident_location_match, $5)
      ON CONFLICT (issue_id) DO UPDATE SET
        incident_id = EXCLUDED.incident_id,
        similarity_score = EXCLUDED.similarity_score,
        location_match = EXCLUDED.location_match
    `,
    [
      input.incident_id,
      input.issue_id,
      input.similarity_score,
      input.location_match ?? null,
      input.linked_by ?? 'AUTO',
    ],
    client,
  );

  await query(
    `UPDATE maintenance_requests SET incident_id = $1 WHERE id = $2`,
    [input.incident_id, input.issue_id],
    client,
  );
}

export async function addAffectedArea(input: {
  incident_id: string;
  building_id?: string | null;
  entrance?: string | null;
  floor?: number | null;
  apartment_id?: string | null;
}, client?: DbClient): Promise<void> {
  await query(
    `
      INSERT INTO incident_affected_areas (incident_id, building_id, entrance, floor, apartment_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (incident_id, apartment_id) DO NOTHING
    `,
    [input.incident_id, input.building_id ?? null, input.entrance ?? null, input.floor ?? null, input.apartment_id ?? null],
    client,
  );
}

export async function addTimelineEvent(input: {
  incident_id: string;
  event_type: string;
  description: string;
  actor_id?: string | null;
  metadata?: Record<string, unknown>;
}, client?: DbClient): Promise<void> {
  await query(
    `
      INSERT INTO incident_timeline (incident_id, event_type, description, actor_id, metadata)
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      input.incident_id,
      input.event_type,
      input.description,
      input.actor_id ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
    client,
  );
}

export async function listIncidentsAdmin(
  organizationId: string | null,
  opts: {
    status?: IncidentStatus;
    priority?: MaintenancePriority;
    building_id?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ data: IncidentAdminRow[]; total: number }> {
  const { status, priority, building_id, limit = 50, offset = 0 } = opts;
  const clauses = organizationId ? ['bi.organization_id = $1'] : ['TRUE'];
  const params: unknown[] = organizationId ? [organizationId] : [];
  let idx = params.length + 1;

  if (status) {
    clauses.push(`bi.status = $${idx++}::incident_status`);
    params.push(status);
  }
  if (priority) {
    clauses.push(`bi.priority = $${idx++}::maint_priority`);
    params.push(priority);
  }
  if (building_id) {
    clauses.push(`bi.building_id = $${idx++}`);
    params.push(building_id);
  }

  const where = clauses.join(' AND ');

  const [dataRes, countRes] = await Promise.all([
    query(
      `
        SELECT bi.*, b.name AS building_name
          FROM building_incidents bi
          LEFT JOIN buildings b ON bi.building_id = b.id
         WHERE ${where}
         ORDER BY
           CASE bi.priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
           bi.detected_at DESC
         LIMIT $${idx++} OFFSET $${idx++}
      `,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM building_incidents bi WHERE ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows.map((r) => ({ ...parseIncident(r), building_name: r.building_name as string | null })),
    total: parseInt(countRes.rows[0]?.count ?? '0', 10),
  };
}

export async function getIncidentDashboardStats(organizationId: string) {
  const { rows } = await query(
    `
      WITH active AS (
        SELECT COUNT(*)::int AS active_incidents
          FROM building_incidents
         WHERE organization_id = $1
           AND status NOT IN ('RESOLVED', 'FALSE_POSITIVE')
      ),
      critical AS (
        SELECT COUNT(*)::int AS critical_count
          FROM building_incidents
         WHERE organization_id = $1
           AND status NOT IN ('RESOLVED', 'FALSE_POSITIVE')
           AND priority = 'CRITICAL'
      ),
      high AS (
        SELECT COUNT(*)::int AS high_count
          FROM building_incidents
         WHERE organization_id = $1
           AND status NOT IN ('RESOLVED', 'FALSE_POSITIVE')
           AND priority = 'HIGH'
      ),
      affected AS (
        SELECT COALESCE(SUM(affected_apartment_count), 0)::int AS affected_residents
          FROM building_incidents
         WHERE organization_id = $1
           AND status NOT IN ('RESOLVED', 'FALSE_POSITIVE')
      ),
      resolution AS (
        SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 3600), 0)::numeric(6,1) AS avg_hours
          FROM building_incidents
         WHERE organization_id = $1 AND resolved_at IS NOT NULL
           AND resolved_at >= NOW() - INTERVAL '90 days'
      )
      SELECT a.active_incidents, c.critical_count, h.high_count,
             af.affected_residents, r.avg_hours
        FROM active a, critical c, high h, affected af, resolution r
    `,
    [organizationId],
  );
  const row = rows[0] ?? {};
  return {
    active_incidents: row.active_incidents ?? 0,
    critical_count: row.critical_count ?? 0,
    high_count: row.high_count ?? 0,
    affected_residents: row.affected_residents ?? 0,
    avg_resolution_hours: parseFloat(String(row.avg_hours ?? 0)),
  };
}

export async function listIncidentIssues(incidentId: string) {
  const { rows } = await query<
    MaintenanceRequest & {
      similarity_score: string;
      location_match: string | null;
      apartment_number: string;
      building_name: string | null;
      floor: number | null;
    }
  >(
    `
      SELECT mr.*, ii.similarity_score, ii.location_match,
             a.apartment_number, b.name AS building_name, a.floor
        FROM incident_issues ii
        JOIN maintenance_requests mr ON ii.issue_id = mr.id
        JOIN apartments a ON mr.apartment_id = a.id
        LEFT JOIN buildings b ON a.building_id = b.id
       WHERE ii.incident_id = $1
       ORDER BY mr.created_at ASC
    `,
    [incidentId],
  );
  return rows.map((r) => ({
    ...r,
    similarity_score: parseFloat(String(r.similarity_score)),
  }));
}

export async function listIncidentTimeline(incidentId: string) {
  const { rows } = await query(
    `SELECT * FROM incident_timeline WHERE incident_id = $1 ORDER BY created_at ASC`,
    [incidentId],
  );
  return rows;
}

export async function listAffectedAreas(incidentId: string) {
  const { rows } = await query(
    `
      SELECT ia.*, a.apartment_number, b.name AS building_name
        FROM incident_affected_areas ia
        LEFT JOIN apartments a ON ia.apartment_id = a.id
        LEFT JOIN buildings b ON ia.building_id = b.id
       WHERE ia.incident_id = $1
    `,
    [incidentId],
  );
  return rows;
}

export async function findRecentSimilarRequests(input: {
  organizationId: string;
  buildingId: string | null;
  detectedType: IncidentIssueType;
  windowMinutes: number;
  excludeRequestId: string;
}, client?: DbClient) {
  const { rows } = await query<
    MaintenanceRequest & {
      apartment_number: string;
      building_id: string | null;
      building_name: string | null;
      tower: string | null;
      entrance: string | null;
      floor: number | null;
    }
  >(
    `
      SELECT mr.*, a.apartment_number, a.building_id, b.name AS building_name,
             a.tower, a.entrance, a.floor
        FROM maintenance_requests mr
        JOIN apartments a ON mr.apartment_id = a.id
        LEFT JOIN buildings b ON a.building_id = b.id
       WHERE mr.organization_id = $1
         AND mr.id != $2
         AND mr.status NOT IN ('CANCELLED', 'COMPLETED')
         AND mr.created_at >= NOW() - ($3::text || ' minutes')::interval
         AND (
           mr.detected_issue_type = $4::incident_issue_type
           OR mr.category = CASE $4::text
             WHEN 'WATER_LEAK' THEN 'PLUMBING'::maint_cat
             WHEN 'NO_WATER' THEN 'PLUMBING'::maint_cat
             WHEN 'LOW_WATER_PRESSURE' THEN 'PLUMBING'::maint_cat
             WHEN 'ELECTRICITY' THEN 'ELECTRICAL'::maint_cat
             WHEN 'HEATING' THEN 'HVAC'::maint_cat
             WHEN 'CLEANING' THEN 'CLEANING'::maint_cat
             ELSE 'OTHER'::maint_cat
           END
         )
         AND ($5::uuid IS NULL OR a.building_id = $5)
       ORDER BY mr.created_at DESC
       LIMIT 50
    `,
    [input.organizationId, input.excludeRequestId, input.windowMinutes, input.detectedType, input.buildingId],
    client,
  );
  return rows;
}

export async function findOpenIncidentForCluster(input: {
  organizationId: string;
  buildingId: string | null;
  category: IncidentIssueType;
}, client?: DbClient) {
  const { rows } = await query(
    `
      SELECT * FROM building_incidents
       WHERE organization_id = $1
         AND category = $2::incident_issue_type
         AND status NOT IN ('RESOLVED', 'FALSE_POSITIVE')
         AND ($3::uuid IS NULL OR building_id = $3)
         AND detected_at >= NOW() - INTERVAL '7 days'
       ORDER BY detected_at DESC
       LIMIT 1
    `,
    [input.organizationId, input.category, input.buildingId],
    client,
  );
  return rows[0] ? parseIncident(rows[0]) : null;
}

export async function getApartmentLocationContext(
  apartmentId: string,
  client?: DbClient,
) {
  const { rows } = await query(
    `
      SELECT a.id AS apartment_id, a.apartment_number, a.building_id, b.name AS building_name,
             a.tower, a.entrance, a.floor
        FROM apartments a
        LEFT JOIN buildings b ON a.building_id = b.id
       WHERE a.id = $1
    `,
    [apartmentId],
    client,
  );
  return rows[0] ?? null;
}

export { withTransaction };
