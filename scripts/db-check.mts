import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Client } from 'pg';
import {
  assertDatabaseUrl,
  getPgPoolConfig,
  getSupabaseConnectionHint,
} from '@/lib/db-config';

const root = process.cwd();

if (existsSync(resolve(root, '.env.local'))) {
  config({ path: resolve(root, '.env.local') });
}
config({ path: resolve(root, '.env') });

async function main(): Promise<void> {
  const databaseUrl = assertDatabaseUrl();
  const client = new Client(getPgPoolConfig(databaseUrl));

  await client.connect();
  const { rows } = await client.query<{ now: string; db: string }>(
    'SELECT NOW()::text AS now, current_database() AS db',
  );
  await client.end();

  console.log('✓ Supabase/PostgreSQL холболт OK');
  console.log(`  Database: ${rows[0].db}`);
  console.log(`  Server time: ${rows[0].now}`);
}

main().catch((error) => {
  console.error('✗ Холболт амжилтгүй:', error instanceof Error ? error.message : error);
  const hint = getSupabaseConnectionHint(error);
  if (hint) console.error(`\n💡 ${hint}`);
  process.exit(1);
});
