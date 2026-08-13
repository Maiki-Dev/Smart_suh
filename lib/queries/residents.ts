import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type { Resident, ResidentStatus, PaginationOptions, ListResult } from '@/types';

export interface ResidentAdminRow extends Resident {
  apartment_number: string;
  building_name: string;
  tower: string | null;
}

const SELECT_SQL = `
  SELECT id, organization_id, apartment_id, user_id, first_name, last_name,
         phone, email, is_owner, status, created_at, updated_at
    FROM residents
`;

export async function getResidentByEmail(
  organizationId: string,
  email: string,
  client?: DbClient,
): Promise<Resident | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await query<Resident>(
    `${SELECT_SQL} WHERE organization_id = $1 AND LOWER(email) = $2 LIMIT 1`,
    [organizationId, normalized],
    client,
  );
  return rows[0] ?? null;
}

export async function getResidentById(
  id: string,
  client?: DbClient,
): Promise<Resident | null> {
  const { rows } = await query<Resident>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function listResidentsByApartment(
  apartmentId: string,
  opts: PaginationOptions = {},
): Promise<ListResult<Resident>> {
  const { limit = 50, offset = 0, orderBy = 'last_name', orderDirection = 'ASC' } = opts;
  const safeOrder = ['first_name', 'last_name', 'is_owner', 'status', 'created_at'].includes(orderBy)
    ? orderBy
    : 'last_name';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

  const [dataRes, countRes] = await Promise.all([
    query<Resident>(
      `${SELECT_SQL} WHERE apartment_id = $1 ORDER BY "${safeOrder}" ${safeDir} LIMIT $2 OFFSET $3`,
      [apartmentId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM residents WHERE apartment_id = $1',
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

export async function listResidentsByOrganization(
  organizationId: string,
  opts: PaginationOptions & { status?: ResidentStatus; search?: string } = {},
): Promise<ListResult<Resident>> {
  const {
    limit = 50,
    offset = 0,
    orderBy = 'last_name',
    orderDirection = 'ASC',
    status,
    search,
  } = opts;

  const safeOrder = ['first_name', 'last_name', 'phone', 'email', 'status', 'created_at'].includes(orderBy)
    ? orderBy
    : 'last_name';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

  const clauses: string[] = ['organization_id = $1'];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (status) {
    clauses.push(`status = $${idx++}::res_status`);
    params.push(status);
  }
  if (search && search.trim().length > 0) {
    const like = `%${search.trim().toLowerCase()}%`;
    clauses.push(
      `(LOWER(first_name) LIKE $${idx} OR LOWER(last_name) LIKE $${idx} OR LOWER(COALESCE(phone,'')) LIKE $${idx} OR LOWER(COALESCE(email,'')) LIKE $${idx})`
    );
    params.push(like);
    idx++;
  }

  const where = `WHERE ${clauses.join(' AND ')}`;

  const [dataRes, countRes] = await Promise.all([
    query<Resident>(
      `${SELECT_SQL} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM residents ${where}`,
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

export async function listResidentsAdminView(
  organizationId: string | null,
  opts: PaginationOptions & {
    status?: ResidentStatus;
    search?: string;
    apartment_id?: string;
  } = {},
): Promise<ListResult<ResidentAdminRow>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'last_name',
    orderDirection = 'ASC',
    status,
    search,
    apartment_id,
  } = opts;

  const safeOrder = ['first_name', 'last_name', 'phone', 'email', 'status', 'created_at', 'apartment_number'].includes(orderBy)
    ? orderBy
    : 'last_name';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';
  const orderColumn =
    safeOrder === 'apartment_number' ? 'a.apartment_number' : `r."${safeOrder}"`;

  const clauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (organizationId) {
    clauses.push(`r.organization_id = $${idx++}`);
    params.push(organizationId);
  }
  if (status) {
    clauses.push(`r.status = $${idx++}::res_status`);
    params.push(status);
  }
  if (apartment_id) {
    clauses.push(`r.apartment_id = $${idx++}`);
    params.push(apartment_id);
  }
  if (search?.trim()) {
    const like = `%${search.trim().toLowerCase()}%`;
    clauses.push(`(
      LOWER(r.first_name) LIKE $${idx}
      OR LOWER(r.last_name) LIKE $${idx}
      OR LOWER(COALESCE(r.phone, '')) LIKE $${idx}
      OR LOWER(COALESCE(r.email, '')) LIKE $${idx}
      OR LOWER(a.apartment_number) LIKE $${idx}
      OR LOWER(b.name) LIKE $${idx}
    )`);
    params.push(like);
    idx++;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [dataRes, countRes] = await Promise.all([
    query<ResidentAdminRow>(
      `
        SELECT r.id, r.organization_id, r.apartment_id, r.user_id, r.first_name, r.last_name,
               r.phone, r.email, r.is_owner, r.status, r.created_at, r.updated_at,
               a.apartment_number, b.name AS building_name, a.tower
          FROM residents r
          JOIN apartments a ON a.id = r.apartment_id
          JOIN buildings b ON b.id = a.building_id
          ${where}
         ORDER BY ${orderColumn} ${safeDir}
         LIMIT $${idx++} OFFSET $${idx++}
      `,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
          FROM residents r
          JOIN apartments a ON a.id = r.apartment_id
          JOIN buildings b ON b.id = a.building_id
          ${where}
      `,
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

export async function getApartmentOwner(
  apartmentId: string,
  client?: DbClient,
): Promise<Resident | null> {
  const { rows } = await query<Resident>(
    `${SELECT_SQL} WHERE apartment_id = $1 AND is_owner = TRUE LIMIT 1`,
    [apartmentId],
    client,
  );
  return rows[0] ?? null;
}

export async function getApartmentIdByResidentUser(
  organizationId: string,
  userId: string,
  client?: DbClient,
): Promise<string | null> {
  const { rows } = await query<{ apartment_id: string }>(
    `
      SELECT apartment_id
        FROM residents
       WHERE organization_id = $1
         AND user_id = $2
         AND status = 'ACTIVE'
       LIMIT 1
    `,
    [organizationId, userId],
    client,
  );
  return rows[0]?.apartment_id ?? null;
}

export async function createResident(input: {
  organization_id: string;
  apartment_id: string;
  user_id?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  is_owner?: boolean;
  status?: ResidentStatus;
  client?: DbClient;
}): Promise<Resident> {
  const {
    organization_id,
    apartment_id,
    user_id = null,
    first_name,
    last_name,
    phone = null,
    email = null,
    is_owner = false,
    status = 'ACTIVE',
    client,
  } = input;

  const { rows } = await query<Resident>(
    `
      INSERT INTO residents
        (organization_id, apartment_id, user_id, first_name, last_name,
         phone, email, is_owner, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::res_status)
      RETURNING id, organization_id, apartment_id, user_id, first_name, last_name,
                phone, email, is_owner, status, created_at, updated_at
    `,
    [organization_id, apartment_id, user_id, first_name, last_name, phone, email, is_owner, status],
    client,
  );
  return rows[0];
}

export async function updateResident(
  id: string,
  input: Partial<Omit<Resident, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>,
): Promise<Resident | null> {
  const existing = await getResidentById(id);
  if (!existing) return null;

  const merged = {
    apartment_id: input.apartment_id ?? existing.apartment_id,
    user_id: input.user_id ?? existing.user_id,
    first_name: input.first_name ?? existing.first_name,
    last_name: input.last_name ?? existing.last_name,
    phone: input.phone ?? existing.phone,
    email: input.email ?? existing.email,
    is_owner: input.is_owner ?? existing.is_owner,
    status: input.status ?? existing.status,
  };

  const { rows } = await query<Resident>(
    `
      UPDATE residents
         SET apartment_id = $1, user_id = $2, first_name = $3, last_name = $4,
             phone = $5, email = $6, is_owner = $7, status = $8::res_status
       WHERE id = $9
       RETURNING id, organization_id, apartment_id, user_id, first_name, last_name,
                 phone, email, is_owner, status, created_at, updated_at
    `,
    [
      merged.apartment_id,
      merged.user_id,
      merged.first_name,
      merged.last_name,
      merged.phone,
      merged.email,
      merged.is_owner,
      merged.status,
      id,
    ],
  );
  return rows[0] ?? null;
}

export async function assignResidentApartment(
  residentId: string,
  apartmentId: string,
  client?: DbClient,
): Promise<Resident | null> {
  const { rows } = await query<Resident>(
    `
      UPDATE residents
         SET apartment_id = $1, is_owner = FALSE
       WHERE id = $2
       RETURNING id, organization_id, apartment_id, user_id, first_name, last_name,
                 phone, email, is_owner, status, created_at, updated_at
    `,
    [apartmentId, residentId],
    client,
  );
  return rows[0] ?? null;
}

export async function setResidentAsOwner(
  residentId: string,
  apartmentId: string,
): Promise<Resident | null> {
  return withTransaction(async (tx) => {
    await query(
      `UPDATE residents SET is_owner = FALSE WHERE apartment_id = $1 AND is_owner = TRUE`,
      [apartmentId],
      tx,
    );
    const { rows } = await query<Resident>(
      `
        UPDATE residents
           SET is_owner = TRUE, apartment_id = $1
         WHERE id = $2
         RETURNING id, organization_id, apartment_id, user_id, first_name, last_name,
                   phone, email, is_owner, status, created_at, updated_at
      `,
      [apartmentId, residentId],
      tx,
    );
    return rows[0] ?? null;
  });
}

export async function deleteResident(id: string): Promise<boolean> {
  return withTransaction(async (tx) => {
    const { rowCount } = await query('DELETE FROM residents WHERE id = $1', [id], tx);
    return (rowCount ?? 0) > 0;
  });
}
