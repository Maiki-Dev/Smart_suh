import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type {
  MaintenanceRequest,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceComment,
  PaginationOptions,
  ListResult,
} from '@/types';

const REQ_SELECT = `
  SELECT id, organization_id, apartment_id, created_by, title, description,
         category, priority, status, created_at, updated_at
    FROM maintenance_requests
`;

const COMMENT_SELECT = `
  SELECT id, request_id, user_id, comment, created_at
    FROM maintenance_comments
`;

export async function getMaintenanceRequestById(
  id: string,
  client?: DbClient,
): Promise<MaintenanceRequest | null> {
  const { rows } = await query<MaintenanceRequest>(`${REQ_SELECT} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function listMaintenanceRequestsByApartment(
  apartmentId: string,
  opts: PaginationOptions & {
    category?: MaintenanceCategory;
    priority?: MaintenancePriority;
    status?: MaintenanceStatus;
  } = {},
): Promise<ListResult<MaintenanceRequest>> {
  return buildMaintenanceList(
    { type: 'apartment', value: apartmentId },
    opts,
  );
}

export async function listMaintenanceRequestsByOrganization(
  organizationId: string,
  opts: PaginationOptions & {
    category?: MaintenanceCategory;
    priority?: MaintenancePriority;
    status?: MaintenanceStatus;
  } = {},
): Promise<ListResult<MaintenanceRequest>> {
  return buildMaintenanceList(
    { type: 'organization', value: organizationId },
    opts,
  );
}

async function buildMaintenanceList(
  scope: { type: 'apartment' | 'organization'; value: string },
  opts: PaginationOptions & {
    category?: MaintenanceCategory;
    priority?: MaintenancePriority;
    status?: MaintenanceStatus;
  },
): Promise<ListResult<MaintenanceRequest>> {
  const {
    limit = 50,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'DESC',
    category,
    priority,
    status,
  } = opts;

  const safeOrder = ['title', 'category', 'priority', 'status', 'created_at', 'updated_at'].includes(orderBy)
    ? orderBy
    : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = [scope.type === 'apartment' ? 'apartment_id = $1' : 'organization_id = $1'];
  const params: unknown[] = [scope.value];
  let idx = 2;

  if (category) {
    clauses.push(`category = $${idx++}::maint_cat`);
    params.push(category);
  }
  if (priority) {
    clauses.push(`priority = $${idx++}::maint_priority`);
    params.push(priority);
  }
  if (status) {
    clauses.push(`status = $${idx++}::maint_status`);
    params.push(status);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  const [dataRes, countRes] = await Promise.all([
    query<MaintenanceRequest>(
      `${REQ_SELECT} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM maintenance_requests ${where}`,
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

export async function createMaintenanceRequest(input: {
  organization_id: string;
  apartment_id: string;
  created_by?: string | null;
  title: string;
  description?: string | null;
  category?: MaintenanceCategory;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
  client?: DbClient;
}): Promise<MaintenanceRequest> {
  const {
    organization_id,
    apartment_id,
    created_by = null,
    title,
    description = null,
    category = 'OTHER',
    priority = 'MEDIUM',
    status = 'OPEN',
    client,
  } = input;

  const { rows } = await query<MaintenanceRequest>(
    `
      INSERT INTO maintenance_requests
        (organization_id, apartment_id, created_by, title, description,
         category, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6::maint_cat, $7::maint_priority, $8::maint_status)
      RETURNING id, organization_id, apartment_id, created_by, title, description,
                category, priority, status, created_at, updated_at
    `,
    [organization_id, apartment_id, created_by, title, description, category, priority, status],
    client,
  );
  return rows[0];
}

export async function updateMaintenanceRequest(
  id: string,
  input: Partial<
    Omit<MaintenanceRequest, 'id' | 'organization_id' | 'apartment_id' | 'created_at' | 'updated_at'>
  >,
  client?: DbClient,
): Promise<MaintenanceRequest | null> {
  const existing = await getMaintenanceRequestById(id, client);
  if (!existing) return null;

  const merged = {
    created_by: input.created_by ?? existing.created_by,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    category: input.category ?? existing.category,
    priority: input.priority ?? existing.priority,
    status: input.status ?? existing.status,
  };

  const { rows } = await query<MaintenanceRequest>(
    `
      UPDATE maintenance_requests
         SET created_by = $1, title = $2, description = $3,
             category = $4::maint_cat, priority = $5::maint_priority, status = $6::maint_status,
             updated_at = NOW()
       WHERE id = $7
       RETURNING id, organization_id, apartment_id, created_by, title, description,
                 category, priority, status, created_at, updated_at
    `,
    [
      merged.created_by,
      merged.title,
      merged.description,
      merged.category,
      merged.priority,
      merged.status,
      id,
    ],
    client,
  );
  return rows[0] ?? null;
}

export interface MaintenanceAdminRow extends MaintenanceRequest {
  apartment_number: string;
  building_name: string;
  tower: string | null;
  resident_name: string | null;
  assigned_operator_name: string | null;
}

export async function listMaintenanceAdminView(
  organizationId: string | null,
  opts: PaginationOptions & {
    category?: MaintenanceCategory;
    priority?: MaintenancePriority;
    status?: MaintenanceStatus;
    apartment_id?: string;
    search?: string;
  } = {},
): Promise<ListResult<MaintenanceAdminRow>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'DESC',
    category,
    priority,
    status,
    apartment_id,
    search,
  } = opts;

  const safeOrder = ['title', 'category', 'priority', 'status', 'created_at', 'updated_at'].includes(orderBy)
    ? orderBy
    : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (organizationId) {
    clauses.push(`mr.organization_id = $${idx++}`);
    params.push(organizationId);
  }
  if (category) {
    clauses.push(`mr.category = $${idx++}::maint_cat`);
    params.push(category);
  }
  if (priority) {
    clauses.push(`mr.priority = $${idx++}::maint_priority`);
    params.push(priority);
  }
  if (status) {
    clauses.push(`mr.status = $${idx++}::maint_status`);
    params.push(status);
  }
  if (apartment_id) {
    clauses.push(`mr.apartment_id = $${idx++}`);
    params.push(apartment_id);
  }
  if (search?.trim()) {
    clauses.push(`(mr.title ILIKE $${idx} OR mr.description ILIKE $${idx})`);
    params.push(`%${search.trim()}%`);
    idx += 1;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const sql = `
    SELECT mr.id, mr.organization_id, mr.apartment_id, mr.created_by, mr.title, mr.description,
           mr.category, mr.priority, mr.status, mr.created_at, mr.updated_at,
           apt.apartment_number, b.name AS building_name, apt.tower,
           TRIM(CONCAT(res.first_name, ' ', res.last_name)) AS resident_name,
           assign.assigned_operator_name
      FROM maintenance_requests mr
      JOIN apartments apt ON apt.id = mr.apartment_id
      JOIN buildings b ON b.id = apt.building_id
      LEFT JOIN residents res ON res.apartment_id = mr.apartment_id AND res.user_id = mr.created_by
      LEFT JOIN LATERAL (
        SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS assigned_operator_name
          FROM audit_logs al
          JOIN users u ON u.id = (al.new_data->>'assigned_to')::uuid
         WHERE al.entity_type = 'maintenance_request'
           AND al.entity_id = mr.id
           AND al.action = 'MAINTENANCE_ASSIGNED'
         ORDER BY al.created_at DESC
         LIMIT 1
      ) assign ON TRUE
      ${where}
     ORDER BY mr."${safeOrder}" ${safeDir}
     LIMIT $${idx++} OFFSET $${idx++}
  `;

  const countSql = `SELECT COUNT(*)::text AS count FROM maintenance_requests mr ${where}`;

  const [dataRes, countRes] = await Promise.all([
    query<MaintenanceAdminRow>(sql, [...params, limit, offset]),
    query<{ count: string }>(countSql, params),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function listMaintenanceComments(
  requestId: string,
  client?: DbClient,
): Promise<MaintenanceComment[]> {
  const { rows } = await query<MaintenanceComment>(
    `${COMMENT_SELECT} WHERE request_id = $1 ORDER BY created_at ASC`,
    [requestId],
    client,
  );
  return rows;
}

export async function createMaintenanceComment(input: {
  request_id: string;
  user_id?: string | null;
  comment: string;
  client?: DbClient;
}): Promise<MaintenanceComment> {
  const { request_id, user_id = null, comment, client } = input;
  const { rows } = await query<MaintenanceComment>(
    `
      INSERT INTO maintenance_comments (request_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING id, request_id, user_id, comment, created_at
    `,
    [request_id, user_id, comment],
    client,
  );
  return rows[0];
}

export { withTransaction };
