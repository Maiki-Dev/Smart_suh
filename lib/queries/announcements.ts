import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type { Announcement, PaginationOptions, ListResult } from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, title, content, image_url, attachment_url,
         published_at, expires_at, is_pinned, created_by, created_at, updated_at
    FROM announcements
`;

export async function getAnnouncementById(
  id: string,
  client?: DbClient,
): Promise<Announcement | null> {
  const { rows } = await query<Announcement>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function listAnnouncementsByOrganization(
  organizationId: string,
  opts: PaginationOptions & {
    only_published?: boolean;
    include_expired?: boolean;
    only_pinned?: boolean;
  } = {},
): Promise<ListResult<Announcement>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'DESC',
    only_published = true,
    include_expired = false,
    only_pinned = false,
  } = opts;

  const safeOrder = ['title', 'published_at', 'expires_at', 'is_pinned', 'created_at'].includes(orderBy)
    ? orderBy
    : 'created_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = ['organization_id = $1'];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (only_published) {
    clauses.push(`published_at IS NOT NULL AND published_at <= NOW()`);
  }
  if (!include_expired) {
    clauses.push(`(expires_at IS NULL OR expires_at >= NOW())`);
  }
  if (only_pinned) {
    clauses.push(`is_pinned = TRUE`);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;
  const order =
    safeOrder === 'created_at'
      ? `ORDER BY is_pinned DESC, "${safeOrder}" ${safeDir}`
      : `ORDER BY "${safeOrder}" ${safeDir}`;

  const [dataRes, countRes] = await Promise.all([
    query<Announcement>(
      `${SELECT_SQL} ${where} ${order} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM announcements ${where}`,
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

export async function createAnnouncement(input: {
  organization_id: string;
  title: string;
  content: string;
  image_url?: string | null;
  attachment_url?: string | null;
  published_at?: string | null;
  expires_at?: string | null;
  is_pinned?: boolean;
  created_by?: string | null;
  client?: DbClient;
}): Promise<Announcement> {
  const {
    organization_id,
    title,
    content,
    image_url = null,
    attachment_url = null,
    published_at = null,
    expires_at = null,
    is_pinned = false,
    created_by = null,
    client,
  } = input;

  const { rows } = await query<Announcement>(
    `
      INSERT INTO announcements
        (organization_id, title, content, image_url, attachment_url,
         published_at, expires_at, is_pinned, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, organization_id, title, content, image_url, attachment_url,
                published_at, expires_at, is_pinned, created_by, created_at, updated_at
    `,
    [organization_id, title, content, image_url, attachment_url, published_at, expires_at, is_pinned, created_by],
    client,
  );
  return rows[0];
}

export async function updateAnnouncement(
  id: string,
  input: Partial<
    Omit<Announcement, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  >,
): Promise<Announcement | null> {
  const existing = await getAnnouncementById(id);
  if (!existing) return null;

  const merged = {
    title: input.title ?? existing.title,
    content: input.content ?? existing.content,
    image_url: input.image_url ?? existing.image_url,
    attachment_url: input.attachment_url ?? existing.attachment_url,
    published_at: input.published_at ?? existing.published_at,
    expires_at: input.expires_at ?? existing.expires_at,
    is_pinned: input.is_pinned ?? existing.is_pinned,
    created_by: input.created_by ?? existing.created_by,
  };

  const { rows } = await query<Announcement>(
    `
      UPDATE announcements
         SET title = $1, content = $2, image_url = $3, attachment_url = $4,
             published_at = $5, expires_at = $6, is_pinned = $7, created_by = $8
       WHERE id = $9
       RETURNING id, organization_id, title, content, image_url, attachment_url,
                 published_at, expires_at, is_pinned, created_by, created_at, updated_at
    `,
    [
      merged.title,
      merged.content,
      merged.image_url,
      merged.attachment_url,
      merged.published_at,
      merged.expires_at,
      merged.is_pinned,
      merged.created_by,
      id,
    ],
  );
  return rows[0] ?? null;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  return withTransaction(async (tx) => {
    const { rowCount } = await query('DELETE FROM announcements WHERE id = $1', [id], tx);
    return (rowCount ?? 0) > 0;
  });
}
