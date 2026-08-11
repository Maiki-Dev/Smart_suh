import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type { Building, PaginationOptions, ListResult } from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, name, address, created_at, updated_at
    FROM buildings
`;

export async function getBuildingById(
  id: string,
  client?: DbClient,
): Promise<Building | null> {
  const { rows } = await query<Building>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function listBuildingsByOrganization(
  organizationId: string,
  opts: PaginationOptions = {},
): Promise<ListResult<Building>> {
  const { limit = 100, offset = 0, orderBy = 'name', orderDirection = 'ASC' } = opts;
  const safeOrder = ['name', 'created_at'].includes(orderBy) ? orderBy : 'name';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

  const [dataRes, countRes] = await Promise.all([
    query<Building>(
      `${SELECT_SQL} WHERE organization_id = $1 ORDER BY "${safeOrder}" ${safeDir} LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM buildings WHERE organization_id = $1',
      [organizationId],
    ),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function getBuildingByName(
  organizationId: string,
  name: string,
  client?: DbClient,
): Promise<Building | null> {
  const { rows } = await query<Building>(
    `${SELECT_SQL} WHERE organization_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1`,
    [organizationId, name],
    client,
  );
  return rows[0] ?? null;
}

export async function findOrCreateBuildingByName(
  organizationId: string,
  name: string,
  client?: DbClient,
): Promise<Building> {
  const trimmed = name.trim();
  const existing = await getBuildingByName(organizationId, trimmed, client);
  if (existing) return existing;
  return createBuilding({ organization_id: organizationId, name: trimmed, client });
}

export async function createBuilding(input: {
  organization_id: string;
  name: string;
  address?: string | null;
  client?: DbClient;
}): Promise<Building> {
  const { organization_id, name, address = null, client } = input;
  const { rows } = await query<Building>(
    `
      INSERT INTO buildings (organization_id, name, address)
      VALUES ($1, $2, $3)
      RETURNING id, organization_id, name, address, created_at, updated_at
    `,
    [organization_id, name, address],
    client,
  );
  return rows[0];
}

export async function updateBuilding(
  id: string,
  input: Partial<Pick<Building, 'name' | 'address'>>,
): Promise<Building | null> {
  const existing = await getBuildingById(id);
  if (!existing) return null;

  const { rows } = await query<Building>(
    `
      UPDATE buildings
         SET name = $1, address = $2
       WHERE id = $3
       RETURNING id, organization_id, name, address, created_at, updated_at
    `,
    [input.name ?? existing.name, input.address ?? existing.address, id],
  );
  return rows[0] ?? null;
}

export async function deleteBuilding(id: string): Promise<boolean> {
  return withTransaction(async (tx) => {
    const { rowCount } = await query('DELETE FROM buildings WHERE id = $1', [id], tx);
    return (rowCount ?? 0) > 0;
  });
}
