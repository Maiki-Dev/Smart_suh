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

function buildSupabaseDatabaseUrl(supabaseUrl: string, password: string): string {
  const projectRef = extractSupabaseProjectRef(supabaseUrl);
  if (!projectRef) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL буруу байна.');
  }

  const encodedPassword = encodeURIComponent(password);
  const poolerHost = getSupabasePoolerHost();

  if (poolerHost) {
    // Session pooler — IPv4 compatible (recommended for local Windows dev)
    return `postgresql://postgres.${projectRef}:${encodedPassword}@${poolerHost}:5432/postgres`;
  }

  // Direct connection — IPv6 only; often fails on IPv4-only networks
  return `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;
}

export function getDatabaseUrl(): string {
  const explicit =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DATABASE_URL?.trim();
  if (explicit) return explicit;

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

function isSupabaseTransactionPooler(connectionString: string): boolean {
  return /pooler\.supabase\.com:6543|pgbouncer=true/i.test(connectionString);
}

export function getPgPoolConfig(connectionString: string): PoolConfig {
  const useSsl = shouldUseSsl(connectionString);
  const transactionPooler = isSupabaseTransactionPooler(connectionString);

  return {
    connectionString,
    max: transactionPooler ? 1 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
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
