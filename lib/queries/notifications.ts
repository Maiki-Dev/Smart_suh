import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type {
  Notification,
  NotificationType,
  PaginationOptions,
  ListResult,
} from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, user_id, type, title, message, is_read, created_at
    FROM notifications
`;

export async function getNotificationById(
  id: string,
  client?: DbClient,
): Promise<Notification | null> {
  const { rows } = await query<Notification>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function listNotificationsByUser(
  userId: string,
  opts: PaginationOptions & {
    is_read?: boolean;
    type?: NotificationType;
  } = {},
): Promise<ListResult<Notification>> {
  const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC', is_read, type } = opts;
  const safeOrder = ['type', 'title', 'is_read', 'created_at'].includes(orderBy)
    ? orderBy
    : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = ['user_id = $1'];
  const params: unknown[] = [userId];
  let idx = 2;

  if (is_read !== undefined) {
    clauses.push(`is_read = $${idx++}`);
    params.push(is_read);
  }
  if (type) {
    clauses.push(`type = $${idx++}::notif_type`);
    params.push(type);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  const [dataRes, countRes] = await Promise.all([
    query<Notification>(
      `${SELECT_SQL} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM notifications ${where}`,
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

export async function countUnreadNotifications(
  userId: string,
  client?: DbClient,
): Promise<number> {
  const { rows } = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE",
    [userId],
    client,
  );
  return parseInt(rows[0].count, 10);
}

export async function createNotification(input: {
  organization_id: string;
  user_id: string;
  type?: NotificationType;
  title: string;
  message?: string | null;
  client?: DbClient;
}): Promise<Notification> {
  const {
    organization_id,
    user_id,
    type = 'SYSTEM',
    title,
    message = null,
    client,
  } = input;

  const { rows } = await query<Notification>(
    `
      INSERT INTO notifications
        (organization_id, user_id, type, title, message)
      VALUES ($1, $2, $3::notif_type, $4, $5)
      RETURNING id, organization_id, user_id, type, title, message, is_read, created_at
    `,
    [organization_id, user_id, type, title, message],
    client,
  );
  return rows[0];
}

export async function markNotificationRead(
  id: string,
  userId: string,
): Promise<boolean> {
  const { rowCount } = await query(
    "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { rowCount } = await query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
    [userId],
  );
  return rowCount ?? 0;
}

export { withTransaction };
