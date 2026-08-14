import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Session, User, Organization } from '@/types';
import { getValidSessionByToken, deleteSession as deleteDbSession, touchSession, extendSession } from '@/lib/queries/sessions';
import { getUserById, getUserByIdentifier } from '@/lib/queries/users';
import { getOrganizationById } from '@/lib/queries/organizations';
import { AUTH_COOKIE_NAME, sessionCookieOptions, clearSessionCookieOptions, SESSION_DURATION_MS } from './cookies';
import { verifyPasswordWithUpgrade } from './password';
import { createSession } from '@/lib/queries/sessions';
import { updateUser } from '@/lib/queries/users';
import type { CookieSerializeOptions } from './types-cookie';

export interface AuthContext {
  session: Session;
  user: User & { organization: Organization | null };
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type CookieSetOptions = Parameters<CookieStore['set']>[2];

function toCookieOptions(input: CookieSerializeOptions): CookieSetOptions {
  return input as unknown as CookieSetOptions;
}

async function readSessionTokenFromCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(AUTH_COOKIE_NAME)?.value;
}

async function writeSessionCookie(token: string, expiresAtMs: number): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, token, toCookieOptions(sessionCookieOptions(expiresAtMs)));
}

async function removeSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, '', toCookieOptions(clearSessionCookieOptions()));
}

export async function getCurrentSession(): Promise<Session | null> {
  const token = await readSessionTokenFromCookie();
  if (!token) return null;
  return getValidSessionByToken(token);
}

export async function getCurrentAuth(): Promise<AuthContext | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const user = await getUserById(session.user_id);
  if (!user || user.status !== 'ACTIVE') return null;

  const organization = await getOrganizationById(user.organization_id);
  await touchSession(session.id);

  return { session, user: { ...user, organization } };
}

export async function requireAuth(options?: {
  skipPasswordChangeRedirect?: boolean;
}): Promise<AuthContext> {
  const ctx = await getCurrentAuth();
  if (!ctx) {
    redirect('/login');
  }
  if (ctx.user.must_change_password && !options?.skipPasswordChangeRedirect) {
    redirect('/change-password');
  }
  return ctx;
}

export async function authenticateByCredentials(input: {
  email: string;
  password: string;
  organizationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<
  | { ok: true; user: User; session: Session; cookieExpiresAtMs: number }
  | { ok: false; reason: 'INVALID_CREDENTIALS' | 'USER_INACTIVE' | 'ORG_MISMATCH' }
> {
  const { email, password, organizationId = null, ipAddress = null, userAgent = null } = input;

  const organization_id = organizationId ?? (await resolveDefaultOrganizationId());
  if (!organization_id) return { ok: false, reason: 'INVALID_CREDENTIALS' };

  const identifier = email?.trim() ?? '';
  if (!identifier) return { ok: false, reason: 'INVALID_CREDENTIALS' };

  const user = await getUserByIdentifier(organization_id, identifier);
  if (!user) return { ok: false, reason: 'INVALID_CREDENTIALS' };
  if (user.status !== 'ACTIVE') return { ok: false, reason: 'USER_INACTIVE' };

  const matches = await verifyPasswordWithUpgrade({
    plaintextPassword: password,
    passwordHash: user.password_hash,
    upgrade: async (newHash) => {
      await updateUser(user.id, { password_hash: newHash });
    },
  });
  if (!matches) return { ok: false, reason: 'INVALID_CREDENTIALS' };

  const expiresMs = Date.now() + SESSION_DURATION_MS;
  const session = await createSession({
    user_id: user.id,
    organization_id: user.organization_id,
    duration_ms: SESSION_DURATION_MS,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  await writeSessionCookie(session.session_token, expiresMs);

  return { ok: true, user, session, cookieExpiresAtMs: expiresMs };
}

async function resolveDefaultOrganizationId(): Promise<string | null> {
  const fromEnv = process.env.DEFAULT_ORGANIZATION_ID;
  if (fromEnv && fromEnv.length) return fromEnv;

  const { query: dbq } = await import('@/lib/db');
  const { rows } = await dbq<{ id: string }>(
    'SELECT id FROM organizations ORDER BY name ASC LIMIT 1'
  );
  return rows[0]?.id ?? null;
}

export async function logoutCurrent(): Promise<void> {
  const token = await readSessionTokenFromCookie();
  if (token) {
    await deleteDbSession(token);
  }
  await removeSessionCookie();
}
