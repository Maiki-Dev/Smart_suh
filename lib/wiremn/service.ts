import 'server-only';

import { randomUUID } from 'crypto';

export const WIRE_MN_API_BASE = 'https://api.wire.mn/v1';

export const WIRE_MN_API_KEY = process.env.WIRE_MN_API_KEY ?? '';

export const WIRE_MN_WEBHOOK_SECRET = process.env.WIRE_MN_WEBHOOK_SECRET ?? '';

export const WIRE_MN_PAYMENT_LINK =
  process.env.WIRE_MN_PAYMENT_LINK ?? 'https://pay.wire.mn/link/';

export const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

function authHeaders(): Record<string, string> {
  if (!WIRE_MN_API_KEY) return {};
  return { Authorization: `Bearer ${WIRE_MN_API_KEY}` };
}

function publicBaseUrl(): string {
  if (NEXT_PUBLIC_APP_URL && NEXT_PUBLIC_APP_URL.trim()) {
    return NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '');
  }
  return '';
}

function parseAllowedOperators(): string[] | undefined {
  const raw = process.env.WIRE_MN_ALLOWED_OPERATORS?.trim();
  if (!raw) return undefined;
  const ops = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ops.length ? ops : undefined;
}

/** Wire dashboard-ийн slug-тай линк: https://pay.wire.mn/link/my-slug */
export function isValidStaticWirePaymentLink(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.hostname === 'pay.wire.mn' && /\/link\/[^/?#]+/.test(u.pathname);
  } catch {
    return false;
  }
}

async function wirePost<T>(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<T | null> {
  if (!WIRE_MN_API_KEY) return null;

  try {
    const res = await fetch(`${WIRE_MN_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        ...authHeaders(),
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const json = (await res.json()) as T | { data?: T };
    if (json && typeof json === 'object' && 'data' in json && json.data) {
      return json.data as T;
    }
    return json as T;
  } catch {
    return null;
  }
}

interface WirePaymentIntent {
  id: string;
  status?: string;
}

interface WireCheckoutSession {
  id: string;
  url: string;
  payment_intent?: string;
}

async function createCheckoutPayment(args: {
  amount: number;
  description?: string;
  reference?: string;
  apartmentId?: string;
  residentUserId?: string;
  successRedirect?: string;
  failRedirect?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ url: string; paymentIntentId: string } | null> {
  if (!WIRE_MN_API_KEY || args.amount <= 0) return null;

  const metadata: Record<string, unknown> = { ...(args.metadata ?? {}) };
  if (args.apartmentId) metadata.apartment_id = args.apartmentId;
  if (args.residentUserId) metadata.user_id = args.residentUserId;
  if (args.reference) metadata.reference = args.reference;

  const intentBody: Record<string, unknown> = {
    amount: Math.round(args.amount),
    currency: 'MNT',
  };
  if (args.description) intentBody.description = args.description;
  if (args.reference) intentBody.reference = args.reference;
  if (Object.keys(metadata).length) intentBody.metadata = metadata;

  const allowedOperators = parseAllowedOperators();
  if (allowedOperators) intentBody.allowed_operators = allowedOperators;

  const intentKey = args.reference
    ? `pi-${args.reference}-${Date.now()}`
    : `pi-${randomUUID()}`;

  const intent = await wirePost<WirePaymentIntent>(
    '/payment_intents',
    intentBody,
    intentKey,
  );
  if (!intent?.id) return null;

  const sessionBody: Record<string, unknown> = {
    payment_intent: intent.id,
  };
  if (args.successRedirect) sessionBody.success_url = args.successRedirect;
  if (args.failRedirect) sessionBody.cancel_url = args.failRedirect;

  const session = await wirePost<WireCheckoutSession>(
    '/checkout/sessions',
    sessionBody,
    `cs-${intent.id}`,
  );
  if (!session?.url) return null;

  return { url: session.url, paymentIntentId: intent.id };
}

export interface ResolvePaymentUrlArgs {
  fallbackAmount?: number;
  description?: string;
  reference?: string;
  apartmentId?: string;
  residentUserId?: string;
  successRedirectPath?: string;
  failRedirectPath?: string;
  metadata?: Record<string, unknown>;
  preferDynamic?: boolean;
}

export interface ResolvePaymentUrlResult {
  url: string;
  isDynamic: boolean;
  linkId?: string | null;
  unavailable?: boolean;
}

export function resolvePaymentUrl(args: ResolvePaymentUrlArgs): ResolvePaymentUrlResult {
  const baseUrl = WIRE_MN_PAYMENT_LINK?.trim();
  const base = publicBaseUrl();

  const successPath = args.successRedirectPath ?? '/resident/payments';
  const failPath = args.failRedirectPath ?? '/resident/payments';

  const successWithQuery = base
    ? `${base}${successPath}?status=success&source=wiremn`
    : successPath;
  const failWithQuery = base
    ? `${base}${failPath}?status=failed&source=wiremn`
    : failPath;

  if (!baseUrl || !isValidStaticWirePaymentLink(baseUrl)) {
    return { url: '#', isDynamic: false, linkId: null, unavailable: true };
  }

  const staticQuery = new URLSearchParams();
  if (args.fallbackAmount != null && args.fallbackAmount > 0) {
    staticQuery.set('amount', String(args.fallbackAmount));
  }
  if (args.description) staticQuery.set('description', args.description);
  if (args.reference) staticQuery.set('reference', args.reference);
  if (args.apartmentId) staticQuery.set('apartment_id', args.apartmentId);
  if (args.residentUserId) staticQuery.set('user_id', args.residentUserId);
  if (base) {
    staticQuery.set('success_redirect_url', successWithQuery);
    staticQuery.set('fail_redirect_url', failWithQuery);
  }
  const staticQs = staticQuery.toString();
  const separator = baseUrl.includes('?') ? '&' : '?';
  const fallbackUrl = staticQs ? `${baseUrl}${separator}${staticQs}` : baseUrl;

  return { url: fallbackUrl, isDynamic: false };
}

export async function resolvePaymentUrlAsync(
  args: ResolvePaymentUrlArgs,
): Promise<ResolvePaymentUrlResult> {
  const base = publicBaseUrl();
  const successPath = args.successRedirectPath ?? '/resident/payments';
  const failPath = args.failRedirectPath ?? '/resident/payments';

  const successRedirect = base ? `${base}${successPath}?status=success&source=wiremn` : undefined;
  const failRedirect = base ? `${base}${failPath}?status=failed&source=wiremn` : undefined;

  const amount = args.fallbackAmount ?? 0;

  if (WIRE_MN_API_KEY && args.preferDynamic !== false && amount > 0) {
    const checkout = await createCheckoutPayment({
      amount,
      description: args.description,
      reference: args.reference,
      apartmentId: args.apartmentId,
      residentUserId: args.residentUserId,
      successRedirect,
      failRedirect,
      metadata: args.metadata,
    });
    if (checkout?.url) {
      return {
        url: checkout.url,
        isDynamic: true,
        linkId: checkout.paymentIntentId,
      };
    }
  }

  const staticResult = resolvePaymentUrl(args);
  if (staticResult.unavailable) {
    return staticResult;
  }
  return staticResult;
}
