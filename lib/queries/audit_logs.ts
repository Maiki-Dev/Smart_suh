import 'server-only';
import { query, type DbClient } from '@/lib/db';
import type { AuditLog, PaginationOptions, ListResult } from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, actor_id, action, entity_type, entity_id,
         old_data, new_data, created_at
    FROM audit_logs
`;

export async function createAuditLog(input: {
  organization_id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  client?: DbClient;
}): Promise<AuditLog> {
  const {
    organization_id,
    actor_id = null,
    action,
    entity_type,
    entity_id = null,
    old_data = null,
    new_data = null,
    client,
  } = input;

  const { rows } = await query<AuditLog>(
    `
      INSERT INTO audit_logs
        (organization_id, actor_id, action, entity_type, entity_id, old_data, new_data)
      VALUES ($1, $2, $3, $4, $5,
              $6::jsonb, $7::jsonb)
      RETURNING id, organization_id, actor_id, action, entity_type, entity_id,
                old_data, new_data, created_at
    `,
    [
      organization_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      old_data ? JSON.stringify(old_data) : null,
      new_data ? JSON.stringify(new_data) : null,
    ],
    client,
  );
  return rows[0];
}

export async function listAuditLogsByOrganization(
  organizationId: string,
  opts: PaginationOptions & {
    action?: string;
    entity_type?: string;
    entity_id?: string;
    actor_id?: string;
    start_date?: string;
    end_date?: string;
  } = {},
): Promise<ListResult<AuditLog>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'DESC',
    action,
    entity_type,
    entity_id,
    actor_id,
    start_date,
    end_date,
  } = opts;

  const safeOrder = ['action', 'entity_type', 'actor_id', 'created_at'].includes(orderBy)
    ? orderBy
    : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = ['organization_id = $1'];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (action) {
    clauses.push(`action = $${idx++}`);
    params.push(action);
  }
  if (entity_type) {
    clauses.push(`entity_type = $${idx++}`);
    params.push(entity_type);
  }
  if (entity_id) {
    clauses.push(`entity_id = $${idx++}`);
    params.push(entity_id);
  }
  if (actor_id) {
    clauses.push(`actor_id = $${idx++}`);
    params.push(actor_id);
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
    query<AuditLog>(
      `${SELECT_SQL} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM audit_logs ${where}`,
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
