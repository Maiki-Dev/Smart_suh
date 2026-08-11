import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type { Apartment, ApartmentStatus, PaginationOptions, ListResult } from '@/types';

export type ApartmentPaymentStatus = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'PENDING' | 'NONE';

export interface ApartmentAdminRow {
  id: string;
  organization_id: string;
  building_id: string;
  building_name: string;
  tower: string | null;
  entrance: string | null;
  floor: number | null;
  apartment_number: string;
  area_m2: number | null;
  monthly_fee: number;
  status: ApartmentStatus;
  owner_id: string | null;
  owner_name: string | null;
  resident_count: number;
  current_debt: number;
  payment_status: ApartmentPaymentStatus;
  vehicle_count: number;
  active_vehicle_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApartmentDetailBundle {
  apartment: Apartment & { building_name: string };
  owner: { id: string; first_name: string; last_name: string } | null;
  current_debt: number;
  payment_status: ApartmentPaymentStatus;
}

const SELECT_SQL = `
  SELECT id, organization_id, building_id, tower, entrance, floor,
         apartment_number, area_m2, monthly_fee, status, created_at, updated_at
    FROM apartments
`;

export async function getApartmentById(
  id: string,
  client?: DbClient,
): Promise<Apartment | null> {
  const { rows } = await query<Apartment>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function getApartmentByNumber(
  buildingId: string,
  apartmentNumber: string,
  client?: DbClient,
): Promise<Apartment | null> {
  const { rows } = await query<Apartment>(
    `${SELECT_SQL} WHERE building_id = $1 AND apartment_number = $2`,
    [buildingId, apartmentNumber],
    client,
  );
  return rows[0] ?? null;
}

export async function listApartmentsByOrganization(
  organizationId: string,
  opts: PaginationOptions & { building_id?: string; status?: ApartmentStatus } = {},
): Promise<ListResult<Apartment>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'apartment_number',
    orderDirection = 'ASC',
    building_id,
    status,
  } = opts;

  const safeOrder = ['apartment_number', 'floor', 'monthly_fee', 'status', 'created_at'].includes(orderBy)
    ? orderBy
    : 'apartment_number';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

  const whereClauses: string[] = ['organization_id = $orgId'];
  const params: unknown[] = [organizationId];
  let paramIdx = 2;

  if (building_id) {
    whereClauses.push(`building_id = $${paramIdx++}`);
    params.push(building_id);
  }
  if (status) {
    whereClauses.push(`status = $${paramIdx++}::apt_status`);
    params.push(status);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const whereSqlNamed = whereSql.replace('$orgId', '$1');

  const [dataRes, countRes] = await Promise.all([
    query<Apartment>(
      `${SELECT_SQL} ${whereSqlNamed} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM apartments ${whereSqlNamed}`,
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

const ADMIN_LIST_SQL = `
  SELECT
    a.id,
    a.organization_id,
    a.building_id,
    b.name AS building_name,
    a.tower,
    a.entrance,
    a.floor,
    a.apartment_number,
    a.area_m2,
    a.monthly_fee,
    a.status,
    owner.id AS owner_id,
    NULLIF(TRIM(CONCAT(owner.first_name, ' ', owner.last_name)), '') AS owner_name,
    COALESCE(res_counts.resident_count, 0)::int AS resident_count,
    COALESCE(debt.current_debt, 0)::float8 AS current_debt,
    CASE
      WHEN COALESCE(debt.overdue_count, 0) > 0 THEN 'OVERDUE'
      WHEN COALESCE(debt.partial_count, 0) > 0 THEN 'PARTIAL'
      WHEN COALESCE(debt.pending_count, 0) > 0 THEN 'PENDING'
      WHEN COALESCE(debt.open_count, 0) = 0 THEN 'NONE'
      ELSE 'PAID'
    END AS payment_status,
    COALESCE(veh.vehicle_count, 0)::int AS vehicle_count,
    COALESCE(veh.active_vehicle_count, 0)::int AS active_vehicle_count,
    a.created_at,
    a.updated_at
  FROM apartments a
  JOIN buildings b ON b.id = a.building_id
  LEFT JOIN residents owner
    ON owner.apartment_id = a.id AND owner.is_owner = TRUE AND owner.status = 'ACTIVE'
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS resident_count
      FROM residents r
     WHERE r.apartment_id = a.id AND r.status = 'ACTIVE'
  ) res_counts ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(SUM(i.remaining_amount), 0) AS current_debt,
      COUNT(*) FILTER (WHERE i.status NOT IN ('PAID', 'CANCELLED')) AS open_count,
      COUNT(*) FILTER (WHERE i.status = 'OVERDUE') AS overdue_count,
      COUNT(*) FILTER (WHERE i.status = 'PARTIAL') AS partial_count,
      COUNT(*) FILTER (WHERE i.status = 'PENDING') AS pending_count
      FROM invoices i
     WHERE i.apartment_id = a.id
       AND i.status NOT IN ('PAID', 'CANCELLED')
  ) debt ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS vehicle_count,
      COUNT(*) FILTER (WHERE v.active = TRUE)::int AS active_vehicle_count
      FROM vehicles v
     WHERE v.apartment_id = a.id
  ) veh ON TRUE
`;

export async function listApartmentsAdminView(
  organizationId: string | null,
  opts: PaginationOptions & {
    building_id?: string;
    status?: ApartmentStatus;
    search?: string;
  } = {},
): Promise<ListResult<ApartmentAdminRow>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'apartment_number',
    orderDirection = 'ASC',
    building_id,
    status,
    search,
  } = opts;

  const safeOrder = ['apartment_number', 'floor', 'monthly_fee', 'status', 'building_name', 'created_at'].includes(orderBy)
    ? orderBy
    : 'apartment_number';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';
  const orderColumn = safeOrder === 'building_name' ? 'b.name' : `a."${safeOrder}"`;

  const clauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (organizationId) {
    clauses.push(`a.organization_id = $${idx++}`);
    params.push(organizationId);
  }
  if (building_id) {
    clauses.push(`a.building_id = $${idx++}`);
    params.push(building_id);
  }
  if (status) {
    clauses.push(`a.status = $${idx++}::apt_status`);
    params.push(status);
  }
  if (search?.trim()) {
    const like = `%${search.trim().toLowerCase()}%`;
    clauses.push(`(
      LOWER(a.apartment_number) LIKE $${idx}
      OR LOWER(COALESCE(a.tower, '')) LIKE $${idx}
      OR LOWER(COALESCE(a.entrance, '')) LIKE $${idx}
      OR LOWER(b.name) LIKE $${idx}
      OR LOWER(COALESCE(owner.first_name, '')) LIKE $${idx}
      OR LOWER(COALESCE(owner.last_name, '')) LIKE $${idx}
    )`);
    params.push(like);
    idx++;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [dataRes, countRes] = await Promise.all([
    query<ApartmentAdminRow>(
      `${ADMIN_LIST_SQL} ${where} ORDER BY ${orderColumn} ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM apartments a JOIN buildings b ON b.id = a.building_id LEFT JOIN residents owner ON owner.apartment_id = a.id AND owner.is_owner = TRUE AND owner.status = 'ACTIVE' ${where}`,
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

export async function getApartmentDetailBundle(
  id: string,
  client?: DbClient,
): Promise<ApartmentDetailBundle | null> {
  const { rows } = await query<Apartment & { building_name: string }>(
    `
      SELECT a.id, a.organization_id, a.building_id, a.tower, a.entrance, a.floor,
             a.apartment_number, a.area_m2, a.monthly_fee, a.status, a.created_at, a.updated_at,
             b.name AS building_name
        FROM apartments a
        JOIN buildings b ON b.id = a.building_id
       WHERE a.id = $1
    `,
    [id],
    client,
  );
  const apartment = rows[0];
  if (!apartment) return null;

  const [ownerRes, debtRes] = await Promise.all([
    query<{ id: string; first_name: string; last_name: string }>(
      `SELECT id, first_name, last_name FROM residents WHERE apartment_id = $1 AND is_owner = TRUE AND status = 'ACTIVE' LIMIT 1`,
      [id],
      client,
    ),
    query<{ current_debt: number; payment_status: ApartmentPaymentStatus }>(
      `
        SELECT
          COALESCE(SUM(remaining_amount), 0)::float8 AS current_debt,
          CASE
            WHEN COUNT(*) FILTER (WHERE status = 'OVERDUE') > 0 THEN 'OVERDUE'
            WHEN COUNT(*) FILTER (WHERE status = 'PARTIAL') > 0 THEN 'PARTIAL'
            WHEN COUNT(*) FILTER (WHERE status = 'PENDING') > 0 THEN 'PENDING'
            WHEN COUNT(*) = 0 THEN 'NONE'
            ELSE 'PAID'
          END AS payment_status
        FROM invoices
       WHERE apartment_id = $1
         AND status NOT IN ('PAID', 'CANCELLED')
      `,
      [id],
      client,
    ),
  ]);

  return {
    apartment,
    owner: ownerRes.rows[0] ?? null,
    current_debt: debtRes.rows[0]?.current_debt ?? 0,
    payment_status: debtRes.rows[0]?.payment_status ?? 'NONE',
  };
}

export async function createApartment(input: {
  organization_id: string;
  building_id: string;
  apartment_number: string;
  tower?: string | null;
  entrance?: string | null;
  floor?: number | null;
  area_m2?: number | null;
  monthly_fee?: number;
  status?: ApartmentStatus;
  client?: DbClient;
}): Promise<Apartment> {
  const {
    organization_id,
    building_id,
    apartment_number,
    tower = null,
    entrance = null,
    floor = null,
    area_m2 = null,
    monthly_fee = 0,
    status = 'OCCUPIED',
    client,
  } = input;

  const { rows } = await query<Apartment>(
    `
      INSERT INTO apartments
        (organization_id, building_id, tower, entrance, floor,
         apartment_number, area_m2, monthly_fee, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::apt_status)
      RETURNING id, organization_id, building_id, tower, entrance, floor,
                apartment_number, area_m2, monthly_fee, status, created_at, updated_at
    `,
    [organization_id, building_id, tower, entrance, floor, apartment_number, area_m2, monthly_fee, status],
    client,
  );
  return rows[0];
}

export async function updateApartment(
  id: string,
  input: Partial<Omit<Apartment, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>,
): Promise<Apartment | null> {
  const existing = await getApartmentById(id);
  if (!existing) return null;

  const merged = {
    building_id: input.building_id ?? existing.building_id,
    tower: input.tower ?? existing.tower,
    entrance: input.entrance ?? existing.entrance,
    floor: input.floor ?? existing.floor,
    apartment_number: input.apartment_number ?? existing.apartment_number,
    area_m2: input.area_m2 ?? existing.area_m2,
    monthly_fee: input.monthly_fee ?? existing.monthly_fee,
    status: input.status ?? existing.status,
  };

  const { rows } = await query<Apartment>(
    `
      UPDATE apartments
         SET building_id = $1, tower = $2, entrance = $3, floor = $4, apartment_number = $5,
             area_m2 = $6, monthly_fee = $7, status = $8::apt_status
       WHERE id = $9
       RETURNING id, organization_id, building_id, tower, entrance, floor,
                 apartment_number, area_m2, monthly_fee, status, created_at, updated_at
    `,
    [
      merged.building_id,
      merged.tower,
      merged.entrance,
      merged.floor,
      merged.apartment_number,
      merged.area_m2,
      merged.monthly_fee,
      merged.status,
      id,
    ],
  );
  return rows[0] ?? null;
}

export async function deleteApartment(id: string): Promise<boolean> {
  return withTransaction(async (tx) => {
    const { rowCount } = await query('DELETE FROM apartments WHERE id = $1', [id], tx);
    return (rowCount ?? 0) > 0;
  });
}

export async function getApartmentDeleteBlockers(
  apartmentId: string,
  client?: DbClient,
): Promise<string[]> {
  const { rows } = await query<{
    invoice_count: string;
    payment_count: string;
    active_residents: string;
  }>(
    `
      SELECT
        (SELECT COUNT(*)::text FROM invoices WHERE apartment_id = $1) AS invoice_count,
        (SELECT COUNT(*)::text FROM payments WHERE apartment_id = $1) AS payment_count,
        (SELECT COUNT(*)::text FROM residents WHERE apartment_id = $1 AND status = 'ACTIVE') AS active_residents
    `,
    [apartmentId],
    client,
  );

  const r = rows[0];
  const blockers: string[] = [];
  if (parseInt(r?.invoice_count ?? '0', 10) > 0) {
    blockers.push('нэхэмжлэл байна');
  }
  if (parseInt(r?.payment_count ?? '0', 10) > 0) {
    blockers.push('төлбөрийн түүх байна');
  }
  if (parseInt(r?.active_residents ?? '0', 10) > 0) {
    blockers.push('идэвхтэй оршин суугч байна');
  }
  return blockers;
}
