import 'server-only';

import type {
  ApartmentTwinCell,
  ApartmentTwinDetail,
  BuildingEvent,
  BuildingTwinData,
  BuildingTwinOverview,
  BuildingTwinSummary,
  HistoricalSnapshot,
  IncidentTwinSummary,
  TwinInsight,
  TwinSearchResult,
} from '@/lib/digital-twin/types';
import {
  computeApartmentHealth,
  computeBuildingHealth,
  parkingStatusLabel,
  type ApartmentRawMetrics,
} from '@/lib/digital-twin/health-engine';
import { parseDigitalTwinSettings } from '@/lib/digital-twin/settings';
import { generateBuildingInsights } from '@/lib/digital-twin/insights';
import { query, type DbClient } from '@/lib/db';
import { getOrganizationById } from '@/lib/queries/organizations';
import { getBuildingById, listBuildingsByOrganization } from '@/lib/queries/buildings';

interface RawApartmentRow {
  apartment_id: string;
  apartment_number: string;
  entrance: string | null;
  floor: number | null;
  tower: string | null;
  apartment_status: string;
  payment_status: string;
  current_debt: number;
  open_issue_count: number;
  critical_issue_count: number;
  high_issue_count: number;
  incident_count: number;
  active_incident_count: number;
  maintenance_open_count: number;
  maintenance_critical_count: number;
  resident_count: number;
  vehicle_count: number;
  active_vehicle_count: number;
  gate_access_count: number;
  suspended_vehicle_count: number;
}

const APARTMENT_METRICS_SQL = `
  SELECT
    a.id AS apartment_id,
    a.apartment_number,
    a.entrance,
    a.floor,
    a.tower,
    a.status AS apartment_status,
    CASE
      WHEN COALESCE(debt.overdue_count, 0) > 0 THEN 'OVERDUE'
      WHEN COALESCE(debt.partial_count, 0) > 0 THEN 'PARTIAL'
      WHEN COALESCE(debt.pending_count, 0) > 0 THEN 'PENDING'
      WHEN COALESCE(debt.open_count, 0) = 0 THEN 'NONE'
      ELSE 'PAID'
    END AS payment_status,
    COALESCE(debt.current_debt, 0)::float8 AS current_debt,
    COALESCE(iss.open_count, 0)::int AS open_issue_count,
    COALESCE(iss.critical_count, 0)::int AS critical_issue_count,
    COALESCE(iss.high_count, 0)::int AS high_issue_count,
    COALESCE(inc.total_count, 0)::int AS incident_count,
    COALESCE(inc.active_count, 0)::int AS active_incident_count,
    COALESCE(maint.open_count, 0)::int AS maintenance_open_count,
    COALESCE(maint.critical_count, 0)::int AS maintenance_critical_count,
    COALESCE(res.resident_count, 0)::int AS resident_count,
    COALESCE(veh.vehicle_count, 0)::int AS vehicle_count,
    COALESCE(veh.active_vehicle_count, 0)::int AS active_vehicle_count,
    COALESCE(veh.gate_access_count, 0)::int AS gate_access_count,
    COALESCE(veh.suspended_vehicle_count, 0)::int AS suspended_vehicle_count
  FROM apartments a
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(SUM(i.remaining_amount), 0) AS current_debt,
      COUNT(*) FILTER (WHERE i.status NOT IN ('PAID', 'CANCELLED')) AS open_count,
      COUNT(*) FILTER (WHERE i.status = 'OVERDUE') AS overdue_count,
      COUNT(*) FILTER (WHERE i.status = 'PARTIAL') AS partial_count,
      COUNT(*) FILTER (WHERE i.status = 'PENDING') AS pending_count
    FROM invoices i
    WHERE i.apartment_id = a.id AND i.status NOT IN ('PAID', 'CANCELLED')
  ) debt ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE mr.status NOT IN ('COMPLETED', 'CANCELLED'))::int AS open_count,
      COUNT(*) FILTER (WHERE mr.status NOT IN ('COMPLETED', 'CANCELLED') AND mr.priority = 'CRITICAL')::int AS critical_count,
      COUNT(*) FILTER (WHERE mr.status NOT IN ('COMPLETED', 'CANCELLED') AND mr.priority = 'HIGH')::int AS high_count
    FROM maintenance_requests mr
    WHERE mr.apartment_id = a.id
  ) iss ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS total_count,
      COUNT(*) FILTER (WHERE bi.status NOT IN ('RESOLVED', 'FALSE_POSITIVE'))::int AS active_count
    FROM incident_affected_areas iaa
    JOIN building_incidents bi ON bi.id = iaa.incident_id
    WHERE iaa.apartment_id = a.id
  ) inc ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE mr.status NOT IN ('COMPLETED', 'CANCELLED'))::int AS open_count,
      COUNT(*) FILTER (WHERE mr.status NOT IN ('COMPLETED', 'CANCELLED') AND mr.priority = 'CRITICAL')::int AS critical_count
    FROM maintenance_requests mr
    WHERE mr.apartment_id = a.id
  ) maint ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS resident_count
    FROM residents r
    WHERE r.apartment_id = a.id AND r.status = 'ACTIVE'
  ) res ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS vehicle_count,
      COUNT(*) FILTER (WHERE v.active = TRUE)::int AS active_vehicle_count,
      COUNT(*) FILTER (WHERE v.gate_access = TRUE AND v.active = TRUE)::int AS gate_access_count,
      COUNT(*) FILTER (WHERE v.active = TRUE AND v.gate_access = FALSE)::int AS suspended_vehicle_count
    FROM vehicles v
    WHERE v.apartment_id = a.id
  ) veh ON TRUE
`;

function rowToRawMetrics(row: RawApartmentRow): ApartmentRawMetrics {
  return {
    apartment_id: row.apartment_id,
    apartment_status: row.apartment_status,
    payment_status: row.payment_status,
    current_debt: row.current_debt,
    open_issue_count: row.open_issue_count,
    critical_issue_count: row.critical_issue_count,
    high_issue_count: row.high_issue_count,
    incident_count: row.incident_count,
    active_incident_count: row.active_incident_count,
    maintenance_open_count: row.maintenance_open_count,
    maintenance_critical_count: row.maintenance_critical_count,
    resident_count: row.resident_count,
    vehicle_count: row.vehicle_count,
    active_vehicle_count: row.active_vehicle_count,
    gate_access_count: row.gate_access_count,
    suspended_vehicle_count: row.suspended_vehicle_count,
  };
}

async function getHealthWeights(organizationId: string, client?: DbClient) {
  const org = await getOrganizationById(organizationId, client);
  return parseDigitalTwinSettings(org?.settings ?? {}).health_weights;
}

export async function listBuildingTwinOverviews(
  organizationId: string,
): Promise<BuildingTwinOverview[]> {
  const buildings = await listBuildingsByOrganization(organizationId, { limit: 200 });
  const weights = await getHealthWeights(organizationId);

  const overviews = await Promise.all(
    buildings.data.map(async (b) => {
      const { rows } = await query<RawApartmentRow>(
        `${APARTMENT_METRICS_SQL} WHERE a.building_id = $1 AND a.status != 'MAINTENANCE'`,
        [b.id],
      );
      const computed = rows.map((row) => computeApartmentHealth(rowToRawMetrics(row), weights));
      const buildingHealth = computeBuildingHealth(computed, weights);

      const { rows: incRows } = await query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count FROM building_incidents
           WHERE building_id = $1 AND status NOT IN ('RESOLVED', 'FALSE_POSITIVE')
        `,
        [b.id],
      );

      return {
        id: b.id,
        name: b.name,
        address: b.address,
        health_score: buildingHealth.health_score,
        health_grade: buildingHealth.health_grade,
        apartment_count: rows.length,
        active_incidents: parseInt(incRows[0]?.count ?? '0', 10),
      };
    }),
  );

  return overviews.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBuildingTwinData(
  buildingId: string,
  organizationId: string,
  opts: { entrance?: string | null; playbackAt?: string | null } = {},
): Promise<BuildingTwinData | null> {
  const building = await getBuildingById(buildingId);
  if (!building || building.organization_id !== organizationId) return null;

  if (opts.playbackAt) {
    return getHistoricalBuildingTwin(buildingId, organizationId, opts.playbackAt, opts.entrance);
  }

  const weights = await getHealthWeights(organizationId);
  const { rows } = await query<RawApartmentRow>(
    `${APARTMENT_METRICS_SQL} WHERE a.building_id = $1`,
    [buildingId],
  );

  let filtered = rows;
  if (opts.entrance) {
    filtered = rows.filter((r) => r.entrance === opts.entrance);
  }

  const apartments: ApartmentTwinCell[] = filtered.map((row) => {
    const health = computeApartmentHealth(rowToRawMetrics(row), weights);
    return {
      id: row.apartment_id,
      apartment_number: row.apartment_number,
      entrance: row.entrance,
      floor: row.floor,
      tower: row.tower,
      status: health.status,
      health_score: health.health_score,
      resident_count: row.resident_count,
      layers: health.layers,
    };
  });

  const computed = filtered.map((row) =>
    computeApartmentHealth(rowToRawMetrics(row), weights),
  );
  const buildingHealth = computeBuildingHealth(computed, weights);

  const paidCount = filtered.filter((r) => r.payment_status === 'PAID' || r.payment_status === 'NONE').length;
  const payment_rate =
    filtered.length > 0 ? Math.round((paidCount / filtered.length) * 100) : 0;

  const summary: BuildingTwinSummary = {
    health_score: buildingHealth.health_score,
    health_grade: buildingHealth.health_grade,
    resident_count: filtered.reduce((s, r) => s + r.resident_count, 0),
    payment_rate,
    open_issues: filtered.reduce((s, r) => s + r.open_issue_count, 0),
    active_incidents: 0,
    vehicle_count: filtered.reduce((s, r) => s + r.vehicle_count, 0),
    apartment_count: filtered.length,
  };

  const entrances = [...new Set(rows.map((r) => r.entrance).filter(Boolean))] as string[];
  const floors = [...new Set(rows.map((r) => r.floor).filter((f): f is number => f != null))].sort(
    (a, b) => b - a,
  );

  const active_incidents = await getActiveIncidentsForBuilding(buildingId);
  summary.active_incidents = active_incidents.length;

  const insights = generateBuildingInsights({
    buildingName: building.name,
    apartments: filtered,
    activeIncidents: active_incidents,
    paymentRate: payment_rate,
    buildingHealth: buildingHealth.health_score,
  });

  const timeline = await getBuildingTimeline(buildingId, organizationId, 50);

  return {
    building: { id: building.id, name: building.name, address: building.address },
    summary,
    entrances: entrances.sort(),
    floors,
    apartments,
    active_incidents,
    insights,
    timeline,
    recorded_at: new Date().toISOString(),
  };
}

async function getActiveIncidentsForBuilding(
  buildingId: string,
): Promise<IncidentTwinSummary[]> {
  const { rows } = await query<{
    id: string;
    incident_number: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    floor_min: number | null;
    floor_max: number | null;
    report_count: number;
    affected_apartment_ids: string[] | null;
  }>(
    `
      SELECT bi.id, bi.incident_number, bi.title, bi.category::text, bi.priority::text,
             bi.status::text, bi.floor_min, bi.floor_max, bi.report_count,
             ARRAY(
               SELECT iaa.apartment_id::text FROM incident_affected_areas iaa
                WHERE iaa.incident_id = bi.id AND iaa.apartment_id IS NOT NULL
             ) AS affected_apartment_ids
        FROM building_incidents bi
       WHERE bi.building_id = $1
         AND bi.status NOT IN ('RESOLVED', 'FALSE_POSITIVE')
       ORDER BY bi.detected_at DESC
    `,
    [buildingId],
  );

  return rows.map((r) => ({
    id: r.id,
    incident_number: r.incident_number,
    title: r.title,
    category: r.category,
    priority: r.priority,
    status: r.status,
    floor_min: r.floor_min,
    floor_max: r.floor_max,
    report_count: r.report_count,
    affected_apartment_ids: r.affected_apartment_ids ?? [],
  }));
}

export async function getApartmentTwinDetail(
  apartmentId: string,
  organizationId: string,
): Promise<ApartmentTwinDetail | null> {
  const weights = await getHealthWeights(organizationId);
  const { rows } = await query<
    RawApartmentRow & { building_id: string; building_name: string }
  >(
    `
      SELECT m.*, a.building_id, b.name AS building_name
        FROM (${APARTMENT_METRICS_SQL} WHERE a.id = $1 AND a.organization_id = $2) m
        JOIN apartments a ON a.id = m.apartment_id
        JOIN buildings b ON b.id = a.building_id
    `,
    [apartmentId, organizationId],
  );

  const row = rows[0];
  if (!row) return null;

  const health = computeApartmentHealth(rowToRawMetrics(row), weights);

  const [residents, vehicles, openIssues, activeIncidents, overdueDays] = await Promise.all([
    query<{ id: string; first_name: string; last_name: string; is_owner: boolean }>(
      `SELECT id, first_name, last_name, is_owner FROM residents
        WHERE apartment_id = $1 AND status = 'ACTIVE' ORDER BY is_owner DESC, last_name`,
      [apartmentId],
    ),
    query<{ id: string; plate_number: string; gate_access: boolean; active: boolean }>(
      `SELECT id, plate_number, gate_access, active FROM vehicles WHERE apartment_id = $1 ORDER BY active DESC`,
      [apartmentId],
    ),
    query<{ id: string; title: string; priority: string; status: string }>(
      `SELECT id, title, priority::text, status::text FROM maintenance_requests
        WHERE apartment_id = $1 AND status NOT IN ('COMPLETED', 'CANCELLED')
        ORDER BY created_at DESC LIMIT 10`,
      [apartmentId],
    ),
    query<{ id: string; incident_number: string; title: string; status: string }>(
      `
        SELECT DISTINCT bi.id, bi.incident_number, bi.title, bi.status::text, bi.detected_at
          FROM incident_affected_areas iaa
          JOIN building_incidents bi ON bi.id = iaa.incident_id
         WHERE iaa.apartment_id = $1
           AND bi.status NOT IN ('RESOLVED', 'FALSE_POSITIVE')
         ORDER BY bi.detected_at DESC
      `,
      [apartmentId],
    ),
    query<{ days: number | null }>(
      `
        SELECT EXTRACT(DAY FROM NOW() - MIN(due_date))::int AS days
          FROM invoices
         WHERE apartment_id = $1 AND status = 'OVERDUE'
      `,
      [apartmentId],
    ),
  ]);

  return {
    id: row.apartment_id,
    apartment_number: row.apartment_number,
    building_id: row.building_id,
    building_name: row.building_name,
    entrance: row.entrance,
    floor: row.floor,
    status: health.status,
    health_score: health.health_score,
    resident_count: row.resident_count,
    current_debt: row.current_debt,
    payment_status: row.payment_status,
    overdue_days: overdueDays.rows[0]?.days ?? null,
    vehicle_count: row.vehicle_count,
    active_vehicle_count: row.active_vehicle_count,
    suspended_vehicle_count: row.suspended_vehicle_count,
    open_issue_count: row.open_issue_count,
    open_issues: openIssues.rows,
    active_incidents: activeIncidents.rows,
    maintenance_open: row.maintenance_open_count,
    residents: residents.rows,
    vehicles: vehicles.rows,
    layers: health.layers,
  };
}

export async function searchDigitalTwin(
  organizationId: string,
  queryText: string,
  buildingId?: string | null,
): Promise<TwinSearchResult[]> {
  const q = queryText.trim();
  if (q.length < 2) return [];

  const params: unknown[] = [organizationId, `%${q}%`];
  let buildingClause = '';
  if (buildingId) {
    buildingClause = 'AND a.building_id = $3';
    params.push(buildingId);
  }

  const { rows } = await query<{
    type: string;
    id: string;
    label: string;
    subtitle: string | null;
    apartment_id: string | null;
    apartment_number: string | null;
    building_id: string | null;
  }>(
    `
      (
        SELECT 'apartment' AS type, a.id, a.apartment_number AS label,
               b.name AS subtitle, a.id AS apartment_id, a.apartment_number,
               a.building_id
          FROM apartments a
          JOIN buildings b ON b.id = a.building_id
         WHERE a.organization_id = $1 AND a.apartment_number ILIKE $2 ${buildingClause}
         LIMIT 8
      )
      UNION ALL
      (
        SELECT 'resident', r.id,
               TRIM(r.first_name || ' ' || r.last_name) AS label,
               a.apartment_number AS subtitle, a.id, a.apartment_number, a.building_id
          FROM residents r
          JOIN apartments a ON a.id = r.apartment_id
         WHERE r.organization_id = $1
           AND (r.first_name ILIKE $2 OR r.last_name ILIKE $2 OR r.phone ILIKE $2)
           ${buildingClause.replace('a.building_id', 'a.building_id')}
         LIMIT 8
      )
      UNION ALL
      (
        SELECT 'vehicle', v.id, v.plate_number, a.apartment_number, a.id, a.apartment_number, a.building_id
          FROM vehicles v
          JOIN apartments a ON a.id = v.apartment_id
         WHERE v.organization_id = $1 AND v.plate_number ILIKE $2 ${buildingClause}
         LIMIT 8
      )
      UNION ALL
      (
        SELECT 'issue', mr.id, mr.title, a.apartment_number, a.id, a.apartment_number, a.building_id
          FROM maintenance_requests mr
          JOIN apartments a ON a.id = mr.apartment_id
         WHERE mr.organization_id = $1 AND (mr.title ILIKE $2 OR mr.id::text ILIKE $2) ${buildingClause}
         LIMIT 5
      )
      UNION ALL
      (
        SELECT 'incident', bi.id, bi.incident_number, bi.title, NULL, NULL, bi.building_id
          FROM building_incidents bi
         WHERE bi.organization_id = $1
           AND (bi.incident_number ILIKE $2 OR bi.title ILIKE $2)
           ${buildingId ? 'AND bi.building_id = $3' : ''}
         LIMIT 5
      )
    `,
    params,
  );

  return rows.map((r) => ({
    type: r.type as TwinSearchResult['type'],
    id: r.id,
    label: r.label,
    subtitle: r.subtitle,
    apartment_id: r.apartment_id,
    apartment_number: r.apartment_number,
    building_id: r.building_id,
  }));
}

async function getBuildingTimeline(
  buildingId: string,
  organizationId: string,
  limit: number,
): Promise<BuildingEvent[]> {
  const { rows: stored } = await query<BuildingEvent>(
    `
      SELECT e.id, e.event_type, e.title, e.description, e.apartment_id,
             a.apartment_number, e.incident_id, e.maintenance_id,
             e.occurred_at::text, e.source
        FROM building_events e
        LEFT JOIN apartments a ON a.id = e.apartment_id
       WHERE e.building_id = $1
       ORDER BY e.occurred_at DESC
       LIMIT $2
    `,
    [buildingId, limit],
  );

  if (stored.length >= 10) return stored;

  const { rows: live } = await query<BuildingEvent>(
    `
      SELECT * FROM (
        (
          SELECT mr.id || '-mc' AS id, 'MAINTENANCE_CREATED' AS event_type,
                 mr.title, 'Засварын хүсэлт бүртгэгдлээ' AS description,
                 mr.apartment_id, a.apartment_number, NULL::uuid AS incident_id,
                 mr.id AS maintenance_id, mr.created_at::text AS occurred_at, 'MAINTENANCE' AS source
            FROM maintenance_requests mr
            JOIN apartments a ON a.id = mr.apartment_id
           WHERE a.building_id = $1
           ORDER BY mr.created_at DESC LIMIT 15
        )
        UNION ALL
        (
          SELECT bi.id || '-id', 'INCIDENT_DETECTED', bi.title,
                 'Incident илэрсэн: ' || bi.incident_number,
                 NULL, NULL, bi.id, NULL, bi.detected_at::text, 'INCIDENT'
            FROM building_incidents bi
           WHERE bi.building_id = $1
           ORDER BY bi.detected_at DESC LIMIT 10
        )
        UNION ALL
        (
          SELECT it.id::text, it.event_type, bi.title, it.description,
                 NULL, NULL, bi.id, NULL, it.created_at::text, 'INCIDENT'
            FROM incident_timeline it
            JOIN building_incidents bi ON bi.id = it.incident_id
           WHERE bi.building_id = $1
           ORDER BY it.created_at DESC LIMIT 10
        )
      ) events
      ORDER BY occurred_at DESC
      LIMIT $2
    `,
    [buildingId, limit],
  );

  const merged = [...stored];
  const seen = new Set(stored.map((e) => e.id));
  for (const e of live) {
    if (!seen.has(e.id)) merged.push(e);
  }
  return merged
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, limit);
}

async function getHistoricalBuildingTwin(
  buildingId: string,
  organizationId: string,
  playbackAt: string,
  entrance?: string | null,
): Promise<BuildingTwinData | null> {
  const building = await getBuildingById(buildingId);
  if (!building || building.organization_id !== organizationId) return null;

  const snapshot = await getNearestBuildingSnapshot(buildingId, playbackAt);
  if (!snapshot) {
    const current = await getBuildingTwinData(buildingId, organizationId, { entrance });
    if (!current) return null;
    return { ...current, recorded_at: playbackAt };
  }

  const aptSnapshots = await getApartmentSnapshotsAt(buildingId, snapshot.recorded_at, entrance);

  const apartments: ApartmentTwinCell[] = aptSnapshots.map((s) => ({
    id: s.apartment_id,
    apartment_number: s.apartment_number,
    entrance: s.entrance,
    floor: s.floor,
    tower: s.tower,
    status: s.status,
    health_score: s.health_score,
    resident_count: s.resident_count,
    layers: (s.layer_data as unknown as ApartmentTwinCell['layers']) ?? {
      overall: 'gray',
      payment: 'gray',
      issues: 'gray',
      incidents: 'gray',
      parking: 'gray',
      maintenance: 'gray',
      occupancy: 'gray',
    },
  }));

  return {
    building: { id: building.id, name: building.name, address: building.address },
    summary: {
      health_score: snapshot.health_score,
      health_grade: snapshot.health_grade,
      resident_count: snapshot.resident_count,
      payment_rate: snapshot.payment_rate,
      open_issues: snapshot.open_issues,
      active_incidents: snapshot.active_incidents,
      vehicle_count: snapshot.vehicle_count,
      apartment_count: snapshot.apartment_count,
    },
    entrances: [...new Set(aptSnapshots.map((s) => s.entrance).filter(Boolean))] as string[],
    floors: [...new Set(aptSnapshots.map((s) => s.floor).filter((f): f is number => f != null))].sort(
      (a, b) => b - a,
    ),
    apartments,
    active_incidents: [],
    insights: [],
    timeline: [],
    recorded_at: snapshot.recorded_at,
  };
}

async function getNearestBuildingSnapshot(buildingId: string, at: string) {
  const { rows } = await query<{
    health_score: number;
    health_grade: string;
    payment_rate: number;
    open_issues: number;
    active_incidents: number;
    resident_count: number;
    vehicle_count: number;
    apartment_count: number;
    recorded_at: string;
  }>(
    `
      SELECT health_score, health_grade, payment_rate, open_issues, active_incidents,
             resident_count, vehicle_count, apartment_count, recorded_at::text
        FROM building_health_snapshots
       WHERE building_id = $1 AND recorded_at <= $2::timestamptz
       ORDER BY recorded_at DESC
       LIMIT 1
    `,
    [buildingId, at],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    health_grade: row.health_grade as BuildingTwinSummary['health_grade'],
  };
}

async function getApartmentSnapshotsAt(
  buildingId: string,
  recordedAt: string,
  entrance?: string | null,
) {
  const params: unknown[] = [buildingId, recordedAt];
  let entranceClause = '';
  if (entrance) {
    entranceClause = 'AND a.entrance = $3';
    params.push(entrance);
  }

  const { rows } = await query<{
    apartment_id: string;
    apartment_number: string;
    entrance: string | null;
    floor: number | null;
    tower: string | null;
    health_score: number;
    status: string;
    resident_count: number;
    layer_data: Record<string, unknown>;
  }>(
    `
      SELECT s.apartment_id, a.apartment_number, a.entrance, a.floor, a.tower,
             s.health_score, s.status::text, s.resident_count, s.layer_data
        FROM apartment_health_snapshots s
        JOIN apartments a ON a.id = s.apartment_id
       WHERE s.building_id = $1
         AND s.recorded_at = (
           SELECT MAX(recorded_at) FROM apartment_health_snapshots
            WHERE building_id = $1 AND recorded_at <= $2::timestamptz
         )
         ${entranceClause}
       ORDER BY a.floor DESC NULLS LAST, a.apartment_number
    `,
    params,
  );

  return rows.map((r) => ({
    ...r,
    status: r.status as ApartmentTwinCell['status'],
  }));
}

export async function recordBuildingHealthSnapshots(
  organizationId: string,
  client?: DbClient,
): Promise<{ buildings: number; apartments: number }> {
  const weights = await getHealthWeights(organizationId, client);
  const { rows: buildings } = await query<{ id: string }>(
    `SELECT id FROM buildings WHERE organization_id = $1`,
    [organizationId],
    client,
  );

  let aptCount = 0;
  for (const b of buildings) {
    const { rows } = await query<RawApartmentRow>(
      `${APARTMENT_METRICS_SQL} WHERE a.building_id = $1`,
      [b.id],
      client,
    );

    const computed = rows.map((row) => {
      const raw = rowToRawMetrics(row);
      const health = computeApartmentHealth(raw, weights);
      return { row, raw, health };
    });

    const buildingHealth = computeBuildingHealth(
      computed.map((c) => c.health),
      weights,
    );

    const paidCount = rows.filter((r) => r.payment_status === 'PAID' || r.payment_status === 'NONE').length;
    const payment_rate = rows.length > 0 ? Math.round((paidCount / rows.length) * 100) : 0;

    const { rows: incRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM building_incidents
        WHERE building_id = $1 AND status NOT IN ('RESOLVED', 'FALSE_POSITIVE')`,
      [b.id],
      client,
    );

    const snapshotRes = await query<{ recorded_at: string }>(
      `
        INSERT INTO building_health_snapshots (
          organization_id, building_id, health_score, health_grade,
          payment_health, issue_health, incident_health, maintenance_health, parking_health,
          payment_rate, open_issues, active_incidents, resident_count, vehicle_count, apartment_count
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING recorded_at::text
      `,
      [
        organizationId,
        b.id,
        buildingHealth.health_score,
        buildingHealth.health_grade,
        buildingHealth.payment_health,
        buildingHealth.issue_health,
        buildingHealth.incident_health,
        buildingHealth.maintenance_health,
        buildingHealth.parking_health,
        payment_rate,
        rows.reduce((s, r) => s + r.open_issue_count, 0),
        parseInt(incRows[0]?.count ?? '0', 10),
        rows.reduce((s, r) => s + r.resident_count, 0),
        rows.reduce((s, r) => s + r.vehicle_count, 0),
        rows.length,
      ],
      client,
    );

    const recordedAt = snapshotRes.rows[0]?.recorded_at;
    if (!recordedAt) continue;

    for (const { row, raw, health } of computed) {
      await query(
        `
          INSERT INTO apartment_health_snapshots (
            organization_id, building_id, apartment_id, health_score, status,
            payment_status, open_issue_count, incident_count, parking_status,
            maintenance_status, resident_count, layer_data, recorded_at
          ) VALUES ($1,$2,$3,$4,$5::apt_health_status,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::timestamptz)
        `,
        [
          organizationId,
          b.id,
          row.apartment_id,
          health.health_score,
          health.status,
          raw.payment_status,
          raw.open_issue_count,
          raw.incident_count,
          parkingStatusLabel(
            raw.vehicle_count,
            raw.gate_access_count,
            raw.suspended_vehicle_count,
          ),
          raw.maintenance_open_count > 0 ? 'OPEN' : 'NONE',
          raw.resident_count,
          JSON.stringify(health.layers),
          recordedAt,
        ],
        client,
      );
      aptCount++;
    }
  }

  return { buildings: buildings.length, apartments: aptCount };
}

export async function getHistoricalSnapshots(
  buildingId: string,
  limit = 48,
): Promise<HistoricalSnapshot[]> {
  const { rows } = await query<{
    recorded_at: string;
    health_score: number;
    health_grade: string;
    payment_rate: number;
    open_issues: number;
    active_incidents: number;
  }>(
    `
      SELECT recorded_at::text, health_score, health_grade, payment_rate, open_issues, active_incidents
        FROM building_health_snapshots
       WHERE building_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2
    `,
    [buildingId, limit],
  );

  return rows.map((r) => ({
    recorded_at: r.recorded_at,
    health_score: r.health_score,
    health_grade: r.health_grade as HistoricalSnapshot['health_grade'],
    payment_rate: r.payment_rate,
    open_issues: r.open_issues,
    active_incidents: r.active_incidents,
    apartments: [],
  }));
}

export async function recordBuildingEvent(input: {
  organization_id: string;
  building_id?: string | null;
  apartment_id?: string | null;
  incident_id?: string | null;
  maintenance_id?: string | null;
  event_type: string;
  title: string;
  description?: string | null;
  source?: string;
  occurred_at?: string;
  metadata?: Record<string, unknown>;
  client?: DbClient;
}): Promise<void> {
  await query(
    `
      INSERT INTO building_events (
        organization_id, building_id, apartment_id, incident_id, maintenance_id,
        event_type, title, description, source, occurred_at, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::timestamptz, NOW()),$11::jsonb)
    `,
    [
      input.organization_id,
      input.building_id ?? null,
      input.apartment_id ?? null,
      input.incident_id ?? null,
      input.maintenance_id ?? null,
      input.event_type,
      input.title,
      input.description ?? null,
      input.source ?? 'SYSTEM',
      input.occurred_at ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
    input.client,
  );
}
