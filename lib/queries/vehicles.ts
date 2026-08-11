import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type { Vehicle, VehicleType, PaginationOptions, ListResult } from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, apartment_id, plate_number, vehicle_type,
         owner_name, rfid_number, active, gate_access,
         access_started_at, access_expires_at, disabled_at, disabled_reason,
         created_at, updated_at
    FROM vehicles
`;

export async function getVehicleById(
  id: string,
  client?: DbClient,
): Promise<Vehicle | null> {
  const { rows } = await query<Vehicle>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function getVehicleByPlate(
  organizationId: string,
  plateNumber: string,
  client?: DbClient,
): Promise<Vehicle | null> {
  const { rows } = await query<Vehicle>(
    `${SELECT_SQL} WHERE organization_id = $1 AND plate_number = $2`,
    [organizationId, plateNumber],
    client,
  );
  return rows[0] ?? null;
}

export async function listVehiclesByApartment(
  apartmentId: string,
  opts: PaginationOptions = {},
): Promise<ListResult<Vehicle>> {
  const { limit = 50, offset = 0, orderBy = 'plate_number', orderDirection = 'ASC' } = opts;
  const safeOrder = ['plate_number', 'vehicle_type', 'owner_name', 'active', 'gate_access', 'created_at'].includes(orderBy)
    ? orderBy
    : 'plate_number';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

  const [dataRes, countRes] = await Promise.all([
    query<Vehicle>(
      `${SELECT_SQL} WHERE apartment_id = $1 ORDER BY "${safeOrder}" ${safeDir} LIMIT $2 OFFSET $3`,
      [apartmentId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM vehicles WHERE apartment_id = $1',
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

export async function listVehiclesByOrganization(
  organizationId: string,
  opts: PaginationOptions & {
    active?: boolean;
    gate_access?: boolean;
    search?: string;
  } = {},
): Promise<ListResult<Vehicle>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'plate_number',
    orderDirection = 'ASC',
    active,
    gate_access,
    search,
  } = opts;

  const safeOrder = ['plate_number', 'vehicle_type', 'owner_name', 'active', 'gate_access', 'created_at'].includes(orderBy)
    ? orderBy
    : 'plate_number';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

  const clauses: string[] = ['organization_id = $1'];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (active !== undefined) {
    clauses.push(`active = $${idx++}`);
    params.push(active);
  }
  if (gate_access !== undefined) {
    clauses.push(`gate_access = $${idx++}`);
    params.push(gate_access);
  }
  if (search && search.trim().length > 0) {
    const like = `%${search.trim().toUpperCase()}%`;
    clauses.push(
      `(UPPER(plate_number) LIKE $${idx} OR UPPER(COALESCE(owner_name,'')) LIKE $${idx} OR UPPER(COALESCE(rfid_number,'')) LIKE $${idx})`
    );
    params.push(like);
    idx++;
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  const [dataRes, countRes] = await Promise.all([
    query<Vehicle>(
      `${SELECT_SQL} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM vehicles ${where}`,
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

export async function createVehicle(input: {
  organization_id: string;
  apartment_id: string;
  plate_number: string;
  vehicle_type?: VehicleType;
  owner_name?: string | null;
  rfid_number?: string | null;
  active?: boolean;
  gate_access?: boolean;
  access_started_at?: string | null;
  access_expires_at?: string | null;
  client?: DbClient;
}): Promise<Vehicle> {
  const {
    organization_id,
    apartment_id,
    plate_number,
    vehicle_type = 'CAR',
    owner_name = null,
    rfid_number = null,
    active = true,
    gate_access = true,
    access_started_at = null,
    access_expires_at = null,
    client,
  } = input;

  const { rows } = await query<Vehicle>(
    `
      INSERT INTO vehicles
        (organization_id, apartment_id, plate_number, vehicle_type, owner_name,
         rfid_number, active, gate_access, access_started_at, access_expires_at)
      VALUES ($1, $2, $3, $4::vehicle_type, $5, $6, $7, $8, $9, $10)
      RETURNING id, organization_id, apartment_id, plate_number, vehicle_type,
                owner_name, rfid_number, active, gate_access,
                access_started_at, access_expires_at, disabled_at, disabled_reason,
                created_at, updated_at
    `,
    [organization_id, apartment_id, plate_number, vehicle_type, owner_name, rfid_number, active, gate_access, access_started_at, access_expires_at],
    client,
  );
  return rows[0];
}

export async function updateVehicle(
  id: string,
  input: Partial<
    Omit<Vehicle, 'id' | 'organization_id' | 'apartment_id' | 'created_at' | 'updated_at'>
  >,
): Promise<Vehicle | null> {
  const existing = await getVehicleById(id);
  if (!existing) return null;

  const merged = {
    plate_number: input.plate_number ?? existing.plate_number,
    vehicle_type: input.vehicle_type ?? existing.vehicle_type,
    owner_name: input.owner_name ?? existing.owner_name,
    rfid_number: input.rfid_number ?? existing.rfid_number,
    active: input.active ?? existing.active,
    gate_access: input.gate_access ?? existing.gate_access,
    access_started_at: input.access_started_at ?? existing.access_started_at,
    access_expires_at: input.access_expires_at ?? existing.access_expires_at,
    disabled_at: input.disabled_at ?? existing.disabled_at,
    disabled_reason: input.disabled_reason ?? existing.disabled_reason,
  };

  const { rows } = await query<Vehicle>(
    `
      UPDATE vehicles
         SET plate_number = $1, vehicle_type = $2::vehicle_type, owner_name = $3,
             rfid_number = $4, active = $5, gate_access = $6,
             access_started_at = $7, access_expires_at = $8,
             disabled_at = $9, disabled_reason = $10
       WHERE id = $11
       RETURNING id, organization_id, apartment_id, plate_number, vehicle_type,
                 owner_name, rfid_number, active, gate_access,
                 access_started_at, access_expires_at, disabled_at, disabled_reason,
                 created_at, updated_at
    `,
    [
      merged.plate_number,
      merged.vehicle_type,
      merged.owner_name,
      merged.rfid_number,
      merged.active,
      merged.gate_access,
      merged.access_started_at,
      merged.access_expires_at,
      merged.disabled_at,
      merged.disabled_reason,
      id,
    ],
  );
  return rows[0] ?? null;
}

export async function deleteVehicle(id: string): Promise<boolean> {
  return withTransaction(async (tx) => {
    const { rowCount } = await query('DELETE FROM vehicles WHERE id = $1', [id], tx);
    return (rowCount ?? 0) > 0;
  });
}
