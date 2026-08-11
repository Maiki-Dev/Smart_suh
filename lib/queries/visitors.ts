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
  client?: DbClient,
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
    client,
  );
  return rows[0] ?? null;
}

export interface VisitorPassAdminRow extends VisitorPass {
  apartment_number: string;
  building_name: string;
  resident_name: string | null;
}

export async function listVisitorPassesAdminView(
  organizationId: string | null,
  opts: PaginationOptions & {
    status?: PassStatus;
    apartment_id?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  } = {},
): Promise<ListResult<VisitorPassAdminRow>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'DESC',
    status,
    apartment_id,
    search,
    date_from,
    date_to,
  } = opts;

  const safeOrder = ['visitor_name', 'valid_from', 'valid_until', 'status', 'created_at'].includes(orderBy)
    ? orderBy
    : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (organizationId) {
    clauses.push(`vp.organization_id = $${idx++}`);
    params.push(organizationId);
  }
  if (status) {
    clauses.push(`vp.status = $${idx++}::pass_status`);
    params.push(status);
  }
  if (apartment_id) {
    clauses.push(`vp.apartment_id = $${idx++}`);
    params.push(apartment_id);
  }
  if (search?.trim()) {
    clauses.push(`(
      vp.visitor_name ILIKE $${idx}
      OR vp.phone ILIKE $${idx}
      OR vp.plate_number ILIKE $${idx}
      OR apt.apartment_number ILIKE $${idx}
    )`);
    params.push(`%${search.trim()}%`);
    idx += 1;
  }
  if (date_from) {
    clauses.push(`vp.valid_from >= $${idx++}::timestamptz`);
    params.push(date_from);
  }
  if (date_to) {
    clauses.push(`vp.valid_until <= $${idx++}::timestamptz`);
    params.push(date_to);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const sql = `
    SELECT vp.id, vp.organization_id, vp.apartment_id, vp.created_by, vp.visitor_name,
           vp.phone, vp.plate_number, vp.valid_from, vp.valid_until, vp.qr_code, vp.status,
           vp.created_at,
           apt.apartment_number,
           b.name AS building_name,
           TRIM(CONCAT(r.first_name, ' ', r.last_name)) AS resident_name
      FROM visitor_passes vp
      JOIN apartments apt ON apt.id = vp.apartment_id
      JOIN buildings b ON b.id = apt.building_id
      LEFT JOIN residents r ON r.apartment_id = vp.apartment_id AND r.status = 'ACTIVE' AND r.user_id = vp.created_by
      ${where}
     ORDER BY vp."${safeOrder}" ${safeDir}
     LIMIT $${idx++} OFFSET $${idx++}
  `;

  const countSql = `
    SELECT COUNT(*)::text AS count
      FROM visitor_passes vp
      JOIN apartments apt ON apt.id = vp.apartment_id
      ${where}
  `;

  const [dataRes, countRes] = await Promise.all([
    query<VisitorPassAdminRow>(sql, [...params, limit, offset]),
    query<{ count: string }>(countSql, params),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

export { withTransaction };
