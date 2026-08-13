import type { PoolConfig } from 'pg';

function extractSupabaseProjectRef(supabaseUrl: string): string | null {
  try {
    const host = new URL(supabaseUrl).hostname;
    const ref = host.split('.')[0];
    return ref || null;
  } catch {
    return null;
  }
}

function getSupabasePoolerHost(): string | null {
  return (
    process.env.SUPABASE_POOLER_HOST?.trim() ||
    process.env.SUPABASE_DB_HOST?.trim() ||
    null
  );
}

function getSupabasePoolerPort(): number {
  const fromEnv = process.env.SUPABASE_POOLER_PORT?.trim();
  if (fromEnv) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  // Transaction pooler — Next.js / serverless-д илүү тохиромжтой (Session 5432-оос хурдан)
  return 6543;
}

function buildSupabaseDatabaseUrl(supabaseUrl: string, password: string): string {
  const projectRef = extractSupabaseProjectRef(supabaseUrl);
  if (!projectRef) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL буруу байна.');
  }

  const encodedPassword = encodeURIComponent(password);
  const poolerHost = getSupabasePoolerHost();

  if (poolerHost) {
    const port = getSupabasePoolerPort();
    const base = `postgresql://postgres.${projectRef}:${encodedPassword}@${poolerHost}:${port}/postgres`;
    // Transaction pooler-д prepared statement идэвхгүй байх ёстой
    return port === 6543 ? `${base}?pgbouncer=true` : base;
  }

  // Direct connection — IPv6 only; often fails on IPv4-only networks
  return `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;
}

function preferTransactionPooler(connectionString: string): string {
  if (process.env.SUPABASE_POOLER_PORT?.trim() === '5432') {
    return connectionString;
  }
  if (!isSupabaseSessionPooler(connectionString)) {
    return connectionString;
  }

  const upgraded = connectionString.replace(
    /pooler\.supabase\.com:5432\//i,
    'pooler.supabase.com:6543/',
  );

  if (/[?&]pgbouncer=/i.test(upgraded)) {
    return upgraded;
  }
  return upgraded.includes('?') ? `${upgraded}&pgbouncer=true` : `${upgraded}?pgbouncer=true`;
}

export function getDatabaseUrl(): string {
  const explicit =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DATABASE_URL?.trim();
  if (explicit) return preferTransactionPooler(explicit);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const dbPassword =
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    process.env.DATABASE_PASSWORD?.trim();

  if (supabaseUrl && dbPassword) {
    return buildSupabaseDatabaseUrl(supabaseUrl, dbPassword);
  }

  return '';
}

export function shouldUseSsl(connectionString: string): boolean {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') return true;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) return true;
  return /supabase|neon\.tech|render\.com|railway|amazonaws|azure|sslmode=require/i.test(
    connectionString,
  );
}

export function isSupabaseTransactionPooler(connectionString: string): boolean {
  return /pooler\.supabase\.com:6543|[?&]pgbouncer=true/i.test(connectionString);
}

export function isSupabaseSessionPooler(connectionString: string): boolean {
  return /pooler\.supabase\.com(?::5432)?(?:\/|$|\?)/i.test(connectionString)
    && !isSupabaseTransactionPooler(connectionString);
}

function resolvePoolMax(connectionString: string): number {
  const envMax = process.env.DATABASE_POOL_MAX?.trim();
  if (envMax) {
    const parsed = Number(envMax);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  // Transaction pooler: хуудас бүр Promise.all-аар олон query зэрэгцүүлдэг
  if (isSupabaseTransactionPooler(connectionString)) {
    return 3;
  }

  // Session pooler: server-side хязgaar бага (≈15) — client pool-ийг маш бага байлгана
  if (isSupabaseSessionPooler(connectionString)) {
    return 1;
  }

  return 5;
}

export function getPgPoolConfig(connectionString: string): PoolConfig {
  const useSsl = shouldUseSsl(connectionString);
  const transactionPooler = isSupabaseTransactionPooler(connectionString);

  return {
    connectionString,
    max: resolvePoolMax(connectionString),
    // 10s idle-д холболт тасрах → дараагийн query 1–2s хүлээнэ; dev-д урт байлгана
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    ...(transactionPooler ? { options: '-c statement_cache_mode=off' } : {}),
  };
}

export function assertDatabaseUrl(connectionString = getDatabaseUrl()): string {
  if (!connectionString) {
    throw new Error(
      'Supabase DB тохиргоо дутуу байна. .env.local дотор NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD (+ SUPABASE_POOLER_HOST) нэмнэ үү.',
    );
  }
  return connectionString;
}

export function getSupabaseConnectionHint(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);

  if (/max clients reached|max clients are limited|pool_size/i.test(message)) {
    if (isSupabaseSessionPooler(getDatabaseUrl())) {
      return (
        'Supabase Session pooler (port 5432) холболтын хязgaar (≈15) дүүрсэн байна. ' +
        'DATABASE_URL-ийг Transaction pooler (port 6543) болгон солино уу, эсвэл dev server-ээ restart хийнэ. ' +
        'Жишээ: postgresql://postgres.[ref]:[pass]@aws-0-REGION.pooler.supabase.com:6543/postgres'
      );
    }
    return (
      'PostgreSQL холболтын pool дүүрсэн байна. Dev server restart хийж, DATABASE_POOL_MAX=1 тохируулна уу.'
    );
  }

  if (!/ENOTFOUND|ETIMEDOUT|timeout expired|EAI_AGAIN/i.test(message)) {
    return null;
  }
  if (getSupabasePoolerHost()) return null;

  return (
    'db.[project].supabase.co зөвхөн IPv6 дээр ажиллана. ' +
    'Supabase Dashboard → Connect → Session pooler host-ийг SUPABASE_POOLER_HOST болгон .env.local-д нэмнэ үү, ' +
    'эсвэл Session pooler DATABASE_URL-ийг шууд хуулна уу.'
  );
}
