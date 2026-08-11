import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type {
  User,
  UserRole,
  UserStatus,
  PaginationOptions,
  ListResult,
} from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, email, password_hash, first_name, last_name,
         phone, role, status, created_at, updated_at
    FROM users
`;

export async function getUserById(
  id: string,
  client?: DbClient,
): Promise<User | null> {
  const { rows } = await query<User>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function getUserByEmail(
  organizationId: string,
  email: string,
  client?: DbClient,
): Promise<User | null> {
  const { rows } = await query<User>(
    `${SELECT_SQL} WHERE organization_id = $1 AND email = $2`,
    [organizationId, email],
    client,
  );
  return rows[0] ?? null;
}

export async function listUsersByOrganization(
  organizationId: string,
  opts: PaginationOptions = {},
): Promise<ListResult<User>> {
  const { limit = 50, offset = 0, orderBy = 'last_name', orderDirection = 'ASC' } = opts;
  const safeOrder = ['first_name', 'last_name', 'email', 'role', 'status', 'created_at'].includes(orderBy)
    ? orderBy
    : 'last_name';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

  const [dataRes, countRes] = await Promise.all([
    query<User>(
      `${SELECT_SQL} WHERE organization_id = $1 ORDER BY "${safeOrder}" ${safeDir} LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM users WHERE organization_id = $1',
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

export async function createUser(input: {
  organization_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role?: UserRole;
  status?: UserStatus;
  client?: DbClient;
}): Promise<User> {
  const {
    organization_id,
    email,
    password_hash,
    first_name,
    last_name,
    phone = null,
    role = 'RESIDENT',
    status = 'ACTIVE',
    client,
  } = input;

  const { rows } = await query<User>(
    `
      INSERT INTO users (organization_id, email, password_hash, first_name,
                         last_name, phone, role, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7::user_role, $8::user_status)
      RETURNING id, organization_id, email, password_hash, first_name, last_name,
                 phone, role, status, created_at, updated_at
    `,
    [organization_id, email, password_hash, first_name, last_name, phone, role, status],
    client,
  );
  return rows[0];
}

export async function updateUser(
  id: string,
  input: Partial<Omit<User, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>,
): Promise<User | null> {
  const existing = await getUserById(id);
  if (!existing) return null;

  const merged = {
    email: input.email ?? existing.email,
    password_hash: input.password_hash ?? existing.password_hash,
    first_name: input.first_name ?? existing.first_name,
    last_name: input.last_name ?? existing.last_name,
    phone: input.phone ?? existing.phone,
    role: input.role ?? existing.role,
    status: input.status ?? existing.status,
  };

  const { rows } = await query<User>(
    `
      UPDATE users
         SET email = $1,
             password_hash = $2,
             first_name = $3,
             last_name = $4,
             phone = $5,
             role = $6::user_role,
             status = $7::user_status
       WHERE id = $8
       RETURNING id, organization_id, email, password_hash, first_name, last_name,
                  phone, role, status, created_at, updated_at
    `,
    [
      merged.email,
      merged.password_hash,
      merged.first_name,
      merged.last_name,
      merged.phone,
      merged.role,
      merged.status,
      id,
    ],
  );
  return rows[0] ?? null;
}

export async function deleteUser(id: string): Promise<boolean> {
  return withTransaction(async (tx) => {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id], tx);
    return (rowCount ?? 0) > 0;
  });
}
