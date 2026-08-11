import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type { VisitorPass, PassStatus, PaginationOptions, ListResult } from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, apartment_id, created_by, visitor_name, phone,
         plate_number, valid_from, valid_until, qr_code, status, created_at
    FROM visitor_passes
`;

export async function getVisitorPassById(
  id: string,
  client?: DbClient,
): Promise<VisitorPass | null> {
  const { rows } = await query<VisitorPass>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function listVisitorPassesByApartment(
  apartmentId: string,
  opts: PaginationOptions = {},
): Promise<ListResult<VisitorPass>> {
  const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = opts;
  const safeOrder = ['visitor_name', 'valid_from', 'valid_until', 'status', 'created_at'].includes(orderBy)
    ? orderBy
    : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const [dataRes, countRes] = await Promise.all([
    query<VisitorPass>(
      `${SELECT_SQL} WHERE apartment_id = $1 ORDER BY "${safeOrder}" ${safeDir} LIMIT $2 OFFSET $3`,
      [apartmentId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM visitor_passes WHERE apartment_id = $1',
      [apartmentId],
    ),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function listVisitorPassesByOrganization(
  organizationId: string,
  opts: PaginationOptions & {
    status?: PassStatus;
    plate_number?: string;
    active_now?: boolean;
  } = {},
): Promise<ListResult<VisitorPass>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'DESC',
    status,
    plate_number,
    active_now,
  } = opts;

  const safeOrder = ['visitor_name', 'valid_from', 'valid_until', 'status', 'created_at'].includes(orderBy)
    ? orderBy
    : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = ['organization_id = $1'];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (status) {
    clauses.push(`status = $${idx++}::pass_status`);
    params.push(status);
  }
  if (plate_number) {
    clauses.push(`plate_number = $${idx++}`);
    params.push(plate_number);
  }
  if (active_now) {
    clauses.push(`valid_from <= NOW() AND valid_until >= NOW() AND status = 'ACTIVE'::pass_status`);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  const [dataRes, countRes] = await Promise.all([
    query<VisitorPass>(
      `${SELECT_SQL} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM visitor_passes ${where}`,
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

export async function createVisitorPass(input: {
  organization_id: string;
  apartment_id: string;
  created_by?: string | null;
  visitor_name: string;
  phone?: string | null;
  plate_number?: string | null;
  valid_from: string;
  valid_until: string;
  qr_code?: string | null;
  status?: PassStatus;
  client?: DbClient;
}): Promise<VisitorPass> {
  const {
    organization_id,
    apartment_id,
    created_by = null,
    visitor_name,
    phone = null,
    plate_number = null,
    valid_from,
    valid_until,
    qr_code = null,
    status = 'ACTIVE',
    client,
  } = input;

  const { rows } = await query<VisitorPass>(
    `
      INSERT INTO visitor_passes
        (organization_id, apartment_id, created_by, visitor_name, phone,
         plate_number, valid_from, valid_until, qr_code, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::pass_status)
      RETURNING id, organization_id, apartment_id, created_by, visitor_name, phone,
                plate_number, valid_from, valid_until, qr_code, status, created_at
    `,
    [organization_id, apartment_id, created_by, visitor_name, phone, plate_number, valid_from, valid_until, qr_code, status],
    client,
  );
  return rows[0];
}

export async function updateVisitorPassStatus(
  id: string,
  status: PassStatus,
): Promise<VisitorPass | null> {
  const { rows } = await query<VisitorPass>(
    `
      UPDATE visitor_passes
         SET status = $1::pass_status
       WHERE id = $2
       RETURNING id, organization_id, apartment_id, created_by, visitor_name, phone,
                 plate_number, valid_from, valid_until, qr_code, status, created_at
    `,
    [status, id],
  );
  return rows[0] ?? null;
}

export { withTransaction };
