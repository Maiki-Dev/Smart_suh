import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
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

  console.log('Supabase/PostgreSQL холбогдож байна...');
  await client.connect();
  console.log('✓ Холболт амжилттай\n');

  const sql = await readFile(join(root, 'database', 'unseed.sql'), 'utf8');
  console.log('→ unseed.sql (ABC Residence seed өгөгдөл устгах)');
  const result = await client.query(sql);
  console.log(`✓ Устгагдсан байгууллага: ${result.rowCount ?? 0}`);

  await client.end();
  console.log('\nБэлэн. Seed/test өгөгдөл цэвэрлэгдлээ.');
}

main().catch((error) => {
  console.error('\nАлдаа:', error instanceof Error ? error.message : error);
  const hint = getSupabaseConnectionHint(error);
  if (hint) console.error(`\n💡 ${hint}`);
  process.exit(1);
});
