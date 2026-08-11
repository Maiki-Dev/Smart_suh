import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type {
  BarrierJob,
  BarrierStatus,
  PaginationOptions,
  ListResult,
} from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, vehicle_id, action, status, attempts, payload,
         last_error, processed_at, created_at
    FROM barrier_jobs
`;

export async function getBarrierJobById(
  id: string,
  client?: DbClient,
): Promise<BarrierJob | null> {
  const { rows } = await query<BarrierJob>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function listPendingBarrierJobs(
  organizationId: string,
  limit = 100,
  client?: DbClient,
): Promise<BarrierJob[]> {
  const { rows } = await query<BarrierJob>(
    `${SELECT_SQL} WHERE organization_id = $1 AND status = 'PENDING'::barrier_status ORDER BY created_at ASC LIMIT $2`,
    [organizationId, limit],
    client,
  );
  return rows;
}

export async function listBarrierJobsByOrganization(
  organizationId: string,
  opts: PaginationOptions & { status?: BarrierStatus } = {},
): Promise<ListResult<BarrierJob>> {
  const { limit = 100, offset = 0, orderBy = 'created_at', orderDirection = 'DESC', status } = opts;
  const safeOrder = ['action', 'status', 'attempts', 'processed_at', 'created_at'].includes(orderBy)
    ? orderBy
    : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = ['organization_id = $1'];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (status) {
    clauses.push(`status = $${idx++}::barrier_status`);
    params.push(status);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  const [dataRes, countRes] = await Promise.all([
    query<BarrierJob>(
      `${SELECT_SQL} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM barrier_jobs ${where}`,
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

export async function createBarrierJob(input: {
  organization_id: string;
  vehicle_id?: string | null;
  action: string;
  payload?: Record<string, unknown>;
  client?: DbClient;
}): Promise<BarrierJob> {
  const {
    organization_id,
    vehicle_id = null,
    action,
    payload = {},
    client,
  } = input;

  const { rows } = await query<BarrierJob>(
    `
      INSERT INTO barrier_jobs (organization_id, vehicle_id, action, payload)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id, organization_id, vehicle_id, action, status, attempts, payload,
                last_error, processed_at, created_at
    `,
    [organization_id, vehicle_id, action, JSON.stringify(payload)],
    client,
  );
  return rows[0];
}

export async function updateBarrierJob(
  id: string,
  input: {
    status: BarrierStatus;
    attempts?: number;
    last_error?: string | null;
    processed_at?: string | null;
  },
): Promise<BarrierJob | null> {
  const existing = await getBarrierJobById(id);
  if (!existing) return null;

  const { rows } = await query<BarrierJob>(
    `
      UPDATE barrier_jobs
         SET status = $1::barrier_status,
             attempts = $2,
             last_error = $3,
             processed_at = $4
       WHERE id = $5
       RETURNING id, organization_id, vehicle_id, action, status, attempts, payload,
                 last_error, processed_at, created_at
    `,
    [
      input.status,
      input.attempts ?? existing.attempts + 1,
      input.last_error ?? null,
      input.processed_at ?? (input.status === 'COMPLETED' || input.status === 'FAILED' ? new Date().toISOString() : null),
      id,
    ],
  );
  return rows[0] ?? null;
}

export { withTransaction };
