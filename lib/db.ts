import 'server-only';
import { Pool, PoolClient, QueryResult, type QueryResultRow } from 'pg';
import 'dotenv/config';
import {
  assertDatabaseUrl,
  getPgPoolConfig,
} from '@/lib/db-config';

type DbClient = Pool | PoolClient;

let globalPool: Pool | undefined;

function createPool(): Pool {
  const databaseUrl = assertDatabaseUrl();
  return new Pool(getPgPoolConfig(databaseUrl));
}

function getPool(): Pool {
  if (!globalPool) {
    globalPool = createPool();
    globalPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL pool', err);
    });
  }
  return globalPool;
}

let lazyPool: Pool | undefined;

function pool(): Pool {
  if (!lazyPool) {
    lazyPool = getPool();
  }
  return lazyPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  client: DbClient = pool(),
): Promise<QueryResult<T>> {
  return client.query(text, params) as Promise<QueryResult<T>>;
}

export async function getClient(): Promise<PoolClient> {
  return pool().connect();
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
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
  if (globalPool) {
    await globalPool.end();
    globalPool = undefined;
    lazyPool = undefined;
  }
}

export type { DbClient };
