import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Client } from 'pg';
import {
  assertDatabaseUrl,
  getDatabaseUrl,
  getPgPoolConfig,
  getSupabaseConnectionHint,
  isSupabaseSessionPooler,
  isSupabaseTransactionPooler,
} from '@/lib/db-config';

const root = process.cwd();

if (existsSync(resolve(root, '.env.local'))) {
  config({ path: resolve(root, '.env.local') });
}
config({ path: resolve(root, '.env') });

async function main(): Promise<void> {
  const databaseUrl = assertDatabaseUrl();
  const poolConfig = getPgPoolConfig(databaseUrl);
  const client = new Client(poolConfig);

  const poolMode = isSupabaseTransactionPooler(databaseUrl)
    ? 'Transaction (6543)'
    : isSupabaseSessionPooler(databaseUrl)
      ? 'Session (5432)'
      : 'Direct / custom';

  const started = performance.now();
  await client.connect();
  const { rows } = await client.query<{ now: string; db: string }>(
    'SELECT NOW()::text AS now, current_database() AS db',
  );
  const latencyMs = Math.round(performance.now() - started);
  await client.end();

  console.log('✓ Supabase/PostgreSQL холболт OK');
  console.log(`  Pool mode: ${poolMode}`);
  console.log(`  Client pool max: ${poolConfig.max}`);
  console.log(`  Query latency: ${latencyMs}ms`);
  console.log(`  Database: ${rows[0].db}`);
  console.log(`  Server time: ${rows[0].now}`);

  if (isSupabaseSessionPooler(getDatabaseUrl())) {
    console.log(
      '\n💡 Session pooler (5432) илүү удаан. Transaction pooler (6543) ашиглахыг зөвлөж байна.',
    );
  }
}

main().catch((error) => {
  console.error('✗ Холболт амжилтгүй:', error instanceof Error ? error.message : error);
  const hint = getSupabaseConnectionHint(error);
  if (hint) console.error(`\n💡 ${hint}`);
  process.exit(1);
});
