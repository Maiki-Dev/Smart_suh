import 'server-only';

import { randomUUID } from 'crypto';
import { buildWireSuccessRedirectUrl } from '@/lib/wiremn/sync-payment-intent';

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
): Promise<{ data: T | null; errorCode: string | null; errorMessage: string | null }> {
  if (!WIRE_MN_API_KEY) {
    return { data: null, errorCode: 'missing_api_key', errorMessage: null };
  }

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

    const text = await res.text();
    if (!res.ok) {
      try {
        const err = JSON.parse(text) as { error?: { code?: string; message?: string } };
        return {
          data: null,
          errorCode: err.error?.code ?? `http_${res.status}`,
          errorMessage: err.error?.message ?? text.slice(0, 200),
        };
      } catch {
        return { data: null, errorCode: `http_${res.status}`, errorMessage: text.slice(0, 200) };
      }
    }

    const json = text ? (JSON.parse(text) as T | { data?: T }) : ({} as T);
    if (json && typeof json === 'object' && 'data' in json && json.data) {
      return { data: json.data as T, errorCode: null, errorMessage: null };
    }
    return { data: json as T, errorCode: null, errorMessage: null };
  } catch {
    return { data: null, errorCode: 'network_error', errorMessage: null };
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
  feeTypes?: string[];
}

export interface ResolvePaymentUrlResult {
  url: string;
  isDynamic: boolean;
  linkId?: string | null;
  unavailable?: boolean;
  wireError?: string | null;
}

function getStaticPaymentLinkUrl(): string {
  return (process.env.WIRE_MN_PAYMENT_LINK ?? WIRE_MN_PAYMENT_LINK).trim();
}

async function createCheckoutPayment(args: {
  amount: number;
  description?: string;
  reference?: string;
  apartmentId?: string;
  residentUserId?: string;
  /** Query string-гүй base URL — pi param checkout үүсэхэд нэмэгдэнэ */
  successRedirectBase?: string;
  failRedirect?: string;
  metadata?: Record<string, unknown>;
  feeTypes?: string[];
}): Promise<{ url: string; paymentIntentId: string } | { error: string } | null> {
  if (!WIRE_MN_API_KEY || args.amount <= 0) return null;

  const metadata: Record<string, unknown> = { ...(args.metadata ?? {}) };
  if (args.apartmentId) metadata.apartment_id = args.apartmentId;
  if (args.residentUserId) metadata.user_id = args.residentUserId;
  if (args.reference) metadata.reference = args.reference;
  if (args.feeTypes?.length) metadata.fee_types = args.feeTypes.join(',');

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

  const intentRes = await wirePost<WirePaymentIntent>(
    '/payment_intents',
    intentBody,
    intentKey,
  );
  if (!intentRes.data?.id) {
    if (intentRes.errorCode === 'settlement_account_required') {
      return {
        error:
          'Wire dashboard → Данс (Accounts) хэсэгт банкны дансаа сонгоно уу.',
      };
    }
    return intentRes.errorMessage ? { error: intentRes.errorMessage } : null;
  }

  const sessionRes = await wirePost<WireCheckoutSession>(
    '/checkout/sessions',
    {
      payment_intent: intentRes.data.id,
      ...(args.successRedirectBase
        ? { success_url: buildWireSuccessRedirectUrl(args.successRedirectBase, intentRes.data.id) }
        : {}),
      ...(args.failRedirect ? { cancel_url: args.failRedirect } : {}),
    },
    `cs-${intentRes.data.id}`,
  );
  if (!sessionRes.data?.url) {
    return sessionRes.errorMessage ? { error: sessionRes.errorMessage } : null;
  }

  return { url: sessionRes.data.url, paymentIntentId: intentRes.data.id };
}

export function resolvePaymentUrl(args: ResolvePaymentUrlArgs): ResolvePaymentUrlResult {
  const baseUrl = getStaticPaymentLinkUrl();
  if (!baseUrl || !isValidStaticWirePaymentLink(baseUrl)) {
    return { url: '#', isDynamic: false, linkId: null, unavailable: true };
  }

  // Wire static линк — dashboard-оос тохируулсан дүн/тохиргоо; query param хэрэггүй
  return { url: baseUrl, isDynamic: false };
}

export async function resolvePaymentUrlAsync(
  args: ResolvePaymentUrlArgs,
): Promise<ResolvePaymentUrlResult> {
  const base = publicBaseUrl();
  const successPath = args.successRedirectPath ?? '/resident/payments';
  const failPath = args.failRedirectPath ?? '/resident/payments';

  const successRedirectBase = base ? `${base}${successPath}` : undefined;
  const failRedirect = base ? `${base}${failPath}?status=failed&source=wiremn` : undefined;

  const amount = args.fallbackAmount ?? 0;

  if (WIRE_MN_API_KEY && args.preferDynamic !== false && amount > 0) {
    const checkout = await createCheckoutPayment({
      amount,
      description: args.description,
      reference: args.reference,
      apartmentId: args.apartmentId,
      residentUserId: args.residentUserId,
      successRedirectBase,
      failRedirect,
      metadata: args.metadata,
      feeTypes: args.feeTypes,
    });
    if (checkout && 'url' in checkout) {
      return {
        url: checkout.url,
        isDynamic: true,
        linkId: checkout.paymentIntentId,
      };
    }
    if (checkout && 'error' in checkout) {
      const staticResult = resolvePaymentUrl(args);
      return {
        ...staticResult,
        wireError: checkout.error,
        unavailable: staticResult.unavailable,
      };
    }
  }

  const staticResult = resolvePaymentUrl(args);
  if (staticResult.unavailable) {
    return staticResult;
  }
  return staticResult;
}
