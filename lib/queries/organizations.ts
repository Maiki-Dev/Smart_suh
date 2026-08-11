import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type {
  Organization,
  PaginationOptions,
  ListResult,
} from '@/types';

const SELECT_SQL = `
  SELECT id, name, registration_number, address, phone, email,
         logo_url, settings, created_at, updated_at
  FROM organizations
`;

export async function getOrganizationById(
  id: string,
  client: DbClient = undefined as unknown as DbClient,
): Promise<Organization | null> {
  const { rows } = await query<Organization>(
    `${SELECT_SQL} WHERE id = $1`,
    [id],
    client,
  );
  return rows[0] ?? null;
}

export async function listOrganizations(
  opts: PaginationOptions = {},
): Promise<ListResult<Organization>> {
  const { limit = 50, offset = 0, orderBy = 'name', orderDirection = 'ASC' } = opts;
  const safeOrder = ['name', 'created_at', 'updated_at'].includes(orderBy) ? orderBy : 'name';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

  const [dataRes, countRes] = await Promise.all([
    query<Organization>(
      `${SELECT_SQL} ORDER BY "${safeOrder}" ${safeDir} LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM organizations'),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function createOrganization(input: {
  name: string;
  registration_number?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  settings?: Record<string, unknown>;
}): Promise<Organization> {
  const {
    name,
    registration_number = null,
    address = null,
    phone = null,
    email = null,
    logo_url = null,
    settings = {},
  } = input;

  const { rows } = await query<Organization>(
    `
      INSERT INTO organizations (name, registration_number, address, phone, email, logo_url, settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING id, name, registration_number, address, phone, email,
                logo_url, settings, created_at, updated_at
    `,
    [name, registration_number, address, phone, email, logo_url, JSON.stringify(settings)],
  );
  return rows[0];
}

export async function updateOrganization(
  id: string,
  input: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Organization | null> {
  const existing = await getOrganizationById(id);
  if (!existing) return null;

  const merged = {
    name: input.name ?? existing.name,
    registration_number: input.registration_number ?? existing.registration_number,
    address: input.address ?? existing.address,
    phone: input.phone ?? existing.phone,
    email: input.email ?? existing.email,
    logo_url: input.logo_url ?? existing.logo_url,
    settings: input.settings ?? existing.settings,
  };

  const { rows } = await query<Organization>(
    `
      UPDATE organizations
         SET name = $1,
             registration_number = $2,
             address = $3,
             phone = $4,
             email = $5,
             logo_url = $6,
             settings = $7::jsonb
       WHERE id = $8
       RETURNING id, name, registration_number, address, phone, email,
                 logo_url, settings, created_at, updated_at
    `,
    [
      merged.name,
      merged.registration_number,
      merged.address,
      merged.phone,
      merged.email,
      merged.logo_url,
      JSON.stringify(merged.settings),
      id,
    ],
  );
  return rows[0] ?? null;
}

export async function deleteOrganization(id: string): Promise<boolean> {
  return withTransaction(async (tx) => {
    const { rowCount } = await query(
      'DELETE FROM organizations WHERE id = $1',
      [id],
      tx,
    );
    return (rowCount ?? 0) > 0;
  });
}
