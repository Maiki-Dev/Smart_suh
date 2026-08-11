export const AUTH_COOKIE_NAME = 'sox_session';

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 хоног

export function isSecureCookie(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  return nodeEnv === 'production';
}

export function getCookieMaxAgeMs(durationMs: number = SESSION_DURATION_MS): number {
  return Math.floor(durationMs);
}

export function getCookieDomain(): string | undefined {
  const raw = process.env.AUTH_COOKIE_DOMAIN;
  return raw && raw.length ? raw : undefined;
}

import type { CookieSerializeOptions } from './types-cookie';
import type { SameSite } from './types-cookie';

export function sessionCookieOptions(
  expiresAtMs: number = Date.now() + SESSION_DURATION_MS,
): CookieSerializeOptions {
  return {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAtMs),
    priority: 'high',
    domain: getCookieDomain(),
  } as CookieSerializeOptions;
}

export function clearSessionCookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    priority: 'high',
    domain: getCookieDomain(),
  } as CookieSerializeOptions;
}

export type { SameSite };
