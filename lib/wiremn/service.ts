import 'server-only';

export const WIRE_MN_API_BASE = 'https://api.wire.mn/v1';

export const WIRE_MN_API_KEY = process.env.WIRE_MN_API_KEY ?? '';

export const WIRE_MN_WEBHOOK_SECRET = process.env.WIRE_MN_WEBHOOK_SECRET ?? '';

export const WIRE_MN_PAYMENT_LINK =
  process.env.WIRE_MN_PAYMENT_LINK ?? 'https://pay.wire.mn/link/';

export const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export interface WireMnLinkCreateInput {
  amount?: number;
  currency?: 'MNT';
  description?: string;
  reference?: string;
  success_redirect_url?: string;
  fail_redirect_url?: string;
  metadata?: Record<string, unknown>;
}

export interface WireMnLink {
  id: string;
  link_url: string;
  amount: number | null;
  currency: string;
  description: string | null;
  reference: string | null;
  status: string;
}

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

export async function createPaymentLink(
  input: WireMnLinkCreateInput,
): Promise<WireMnLink | null> {
  if (!WIRE_MN_API_KEY) return null;

  const body: Record<string, unknown> = {};
  if (input.amount != null) body.amount = input.amount;
  body.currency = input.currency ?? 'MNT';
  if (input.description) body.description = input.description;
  if (input.reference) body.reference = input.reference;
  if (input.success_redirect_url) body.success_redirect_url = input.success_redirect_url;
  if (input.fail_redirect_url) body.fail_redirect_url = input.fail_redirect_url;
  if (input.metadata) body.metadata = input.metadata;

  try {
    const res = await fetch(`${WIRE_MN_API_BASE}/links`, {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS, ...authHeaders() },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as { data?: WireMnLink };
    return json.data ?? (json as unknown as WireMnLink) ?? null;
  } catch {
    return null;
  }
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

  const metadata: Record<string, unknown> = { ...(args.metadata ?? {}) };
  if (args.apartmentId) metadata.apartment_id = args.apartmentId;
  if (args.residentUserId) metadata.user_id = args.residentUserId;

  const tryDynamic = args.preferDynamic !== false && Boolean(WIRE_MN_API_KEY);
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
  const fallbackUrl = baseUrl ? (staticQs ? `${baseUrl}?${staticQs}` : baseUrl) : '#';

  if (!tryDynamic) {
    return { url: fallbackUrl, isDynamic: false };
  }

  return {
    url: fallbackUrl,
    isDynamic: false,
    linkId: null,
  };
}

export async function resolvePaymentUrlAsync(
  args: ResolvePaymentUrlArgs,
): Promise<ResolvePaymentUrlResult> {
  const base = publicBaseUrl();
  const successPath = args.successRedirectPath ?? '/resident/payments';
  const failPath = args.failRedirectPath ?? '/resident/payments';

  const successRedirect = base ? `${base}${successPath}?status=success&source=wiremn` : undefined;
  const failRedirect = base ? `${base}${failPath}?status=failed&source=wiremn` : undefined;

  const metadata: Record<string, unknown> = { ...(args.metadata ?? {}) };
  if (args.apartmentId) metadata.apartment_id = args.apartmentId;
  if (args.residentUserId) metadata.user_id = args.residentUserId;

  if (WIRE_MN_API_KEY && args.preferDynamic !== false) {
    try {
      const link = await createPaymentLink({
        amount: args.fallbackAmount,
        currency: 'MNT',
        description: args.description,
        reference: args.reference,
        success_redirect_url: successRedirect,
        fail_redirect_url: failRedirect,
        metadata,
      });
      if (link?.link_url) {
        return { url: link.link_url, isDynamic: true, linkId: link.id };
      }
    } catch {
      // fallthrough to static
    }
  }

  const staticResult = resolvePaymentUrl(args);
  return staticResult;
}
