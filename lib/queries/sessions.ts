import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type { Session } from '@/types';
import { randomUUID } from 'crypto';

const SELECT_SQL = `
  SELECT id, session_token, user_id, organization_id, ip_address,
         user_agent, expires_at, created_at, last_active_at
    FROM sessions
`;

export async function getSessionByToken(
  token: string,
  client?: DbClient,
): Promise<Session | null> {
  const { rows } = await query<Session>(
    `${SELECT_SQL} WHERE session_token = $1`,
    [token],
    client,
  );
  return rows[0] ?? null;
}

export async function getValidSessionByToken(
  token: string,
  client?: DbClient,
): Promise<Session | null> {
  const { rows } = await query<Session>(
    `${SELECT_SQL} WHERE session_token = $1 AND expires_at > NOW()`,
    [token],
    client,
  );
  return rows[0] ?? null;
}

export async function createSession(input: {
  user_id: string;
  organization_id: string;
  duration_ms?: number;
  ip_address?: string | null;
  user_agent?: string | null;
  client?: DbClient;
}): Promise<Session> {
  const {
    user_id,
    organization_id,
    duration_ms = 1000 * 60 * 60 * 24 * 7,
    ip_address = null,
    user_agent = null,
    client,
  } = input;

  const token = `sess_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
  const expires_at = new Date(Date.now() + duration_ms).toISOString();

  const { rows } = await query<Session>(
    `
      INSERT INTO sessions
        (session_token, user_id, organization_id, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, session_token, user_id, organization_id, ip_address,
                user_agent, expires_at, created_at, last_active_at
    `,
    [token, user_id, organization_id, ip_address, user_agent, expires_at],
    client,
  );
  return rows[0];
}

export async function touchSession(
  sessionId: string,
  client?: DbClient,
): Promise<void> {
  await query(
    "UPDATE sessions SET last_active_at = NOW() WHERE id = $1",
    [sessionId],
    client,
  );
}

export async function extendSession(
  sessionId: string,
  extend_ms: number,
  client?: DbClient,
): Promise<Session | null> {
  const { rows } = await query<Session>(
    `
      UPDATE sessions
         SET expires_at   = GREATEST(expires_at, NOW() + ($1 || ' milliseconds')::interval),
             last_active_at = NOW()
       WHERE id = $2
       RETURNING id, session_token, user_id, organization_id, ip_address,
                 user_agent, expires_at, created_at, last_active_at
    `,
    [extend_ms, sessionId],
    client,
  );
  return rows[0] ?? null;
}

export async function deleteSession(
  session_token: string,
  client?: DbClient,
): Promise<boolean> {
  const { rowCount } = await query(
    'DELETE FROM sessions WHERE session_token = $1',
    [session_token],
    client,
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteAllSessionsForUser(
  userId: string,
  excludeSessionId?: string,
): Promise<number> {
  return withTransaction(async (tx) => {
    const sql = excludeSessionId
      ? 'DELETE FROM sessions WHERE user_id = $1 AND id <> $2'
      : 'DELETE FROM sessions WHERE user_id = $1';
    const params = excludeSessionId ? [userId, excludeSessionId] : [userId];
    const { rowCount } = await query(sql, params, tx);
    return rowCount ?? 0;
  });
}

export async function pruneExpiredSessions(): Promise<number> {
  const { rows } = await query<{ pruned: string }>(
    "SELECT prune_expired_sessions()::text AS pruned"
  );
  return parseInt(rows[0].pruned, 10);
}

export async function listSessionsByUser(
  userId: string,
  client?: DbClient,
): Promise<Session[]> {
  const { rows } = await query<Session>(
    `${SELECT_SQL} WHERE user_id = $1 ORDER BY last_active_at DESC`,
    [userId],
    client,
  );
  return rows;
}
