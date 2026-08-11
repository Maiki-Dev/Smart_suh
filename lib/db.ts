import 'server-only';
import { Pool, PoolClient, QueryResult, type QueryResultRow } from 'pg';
import 'dotenv/config';
import {
  assertDatabaseUrl,
  getPgPoolConfig,
  getSupabaseConnectionHint,
} from '@/lib/db-config';

type DbClient = Pool | PoolClient;

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
};

function createPool(): Pool {
  const databaseUrl = assertDatabaseUrl();
  const pool = new Pool(getPgPoolConfig(databaseUrl));
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL pool', err);
  });
  return pool;
}

function getPool(): Pool {
  if (!globalForDb.pgPool) {
    globalForDb.pgPool = createPool();
  }
  return globalForDb.pgPool;
}

function pool(): Pool {
  return getPool();
}

function wrapQueryError(error: unknown): never {
  const hint = getSupabaseConnectionHint(error);
  if (hint && error instanceof Error) {
    throw new Error(`${error.message}\n\n${hint}`);
  }
  throw error;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  client: DbClient = pool(),
): Promise<QueryResult<T>> {
  try {
    return (await client.query(text, params)) as QueryResult<T>;
  } catch (error) {
    wrapQueryError(error);
  }
}

export async function getClient(): Promise<PoolClient> {
  try {
    return await pool().connect();
  } catch (error) {
    wrapQueryError(error);
  }
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function endPool(): Promise<void> {
  if (globalForDb.pgPool) {
    await globalForDb.pgPool.end();
    globalForDb.pgPool = undefined;
  }
}

export type { DbClient };
