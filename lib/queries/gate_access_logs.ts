import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type { GateAccessLog, GateAction, PaginationOptions, ListResult } from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, vehicle_id, apartment_id, action, reason,
         triggered_by, created_at
    FROM gate_access_logs
`;

export async function createGateAccessLog(input: {
  organization_id: string;
  vehicle_id?: string | null;
  apartment_id?: string | null;
  action: GateAction;
  reason?: string | null;
  triggered_by?: string | null;
  client?: DbClient;
}): Promise<GateAccessLog> {
  const {
    organization_id,
    vehicle_id = null,
    apartment_id = null,
    action,
    reason = null,
    triggered_by = null,
    client,
  } = input;

  const { rows } = await query<GateAccessLog>(
    `
      INSERT INTO gate_access_logs
        (organization_id, vehicle_id, apartment_id, action, reason, triggered_by)
      VALUES ($1, $2, $3, $4::gate_action, $5, $6)
      RETURNING id, organization_id, vehicle_id, apartment_id, action, reason,
                triggered_by, created_at
    `,
    [organization_id, vehicle_id, apartment_id, action, reason, triggered_by],
    client,
  );
  return rows[0];
}

export async function listGateAccessLogsForApartment(
  apartmentId: string,
  opts: PaginationOptions = {},
): Promise<ListResult<GateAccessLog>> {
  const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = opts;
  const safeOrder = ['action', 'created_at'].includes(orderBy) ? orderBy : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const where = 'WHERE apartment_id = $1';
  const params: unknown[] = [apartmentId];

  const [dataRes, countRes] = await Promise.all([
    query<GateAccessLog>(
      `${SELECT_SQL} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $2 OFFSET $3`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM gate_access_logs ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function listGateAccessLogsByOrganization(
  organizationId: string,
  opts: PaginationOptions & {
    action?: GateAction;
    vehicle_id?: string;
    apartment_id?: string;
    start_date?: string;
    end_date?: string;
  } = {},
): Promise<ListResult<GateAccessLog>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'DESC',
    action,
    vehicle_id,
    apartment_id,
    start_date,
    end_date,
  } = opts;

  const safeOrder = ['action', 'created_at'].includes(orderBy) ? orderBy : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = ['organization_id = $1'];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (action) {
    clauses.push(`action = $${idx++}::gate_action`);
    params.push(action);
  }
  if (vehicle_id) {
    clauses.push(`vehicle_id = $${idx++}`);
    params.push(vehicle_id);
  }
  if (apartment_id) {
    clauses.push(`apartment_id = $${idx++}`);
    params.push(apartment_id);
  }
  if (start_date) {
    clauses.push(`created_at >= $${idx++}`);
    params.push(start_date);
  }
  if (end_date) {
    clauses.push(`created_at <= $${idx++}`);
    params.push(end_date);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  const [dataRes, countRes] = await Promise.all([
    query<GateAccessLog>(
      `${SELECT_SQL} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM gate_access_logs ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

export { withTransaction };
