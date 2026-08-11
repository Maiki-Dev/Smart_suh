import { readFile, readdir } from 'node:fs/promises';
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

async function runSqlFile(client: Client, filePath: string, label: string): Promise<void> {
  const sql = await readFile(filePath, 'utf8');
  console.log(`→ ${label}`);
  await client.query(sql);
  console.log(`✓ ${label}`);
}

async function main(): Promise<void> {
  const databaseUrl = assertDatabaseUrl();
  const client = new Client(getPgPoolConfig(databaseUrl));

  console.log('Supabase/PostgreSQL холбогдож байна...');
  await client.connect();
  console.log('✓ Холболт амжилттай\n');

  const migrationsDir = join(root, 'database', 'migrations');
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    await runSqlFile(client, join(migrationsDir, file), file);
  }

  if (process.argv.includes('--seed')) {
    await runSqlFile(client, join(root, 'database', 'seed.sql'), 'seed.sql');
  }

  await client.end();
  console.log('\nБэлэн. Одоо npm run dev ажиллуулаад login хуудсаар туршина уу.');
}

main().catch((error) => {
  console.error('\nАлдаа:', error instanceof Error ? error.message : error);
  const hint = getSupabaseConnectionHint(error);
  if (hint) console.error(`\n💡 ${hint}`);
  process.exit(1);
});
