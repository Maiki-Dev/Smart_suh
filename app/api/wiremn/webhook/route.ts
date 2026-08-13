import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getApartmentById } from '@/lib/queries/apartments';
import { applyApartmentPayment, getPaymentByWireTransactionId } from '@/lib/payments/apply-apartment-payment';
import { WIRE_MN_API_KEY, WIRE_MN_WEBHOOK_SECRET } from '@/lib/wiremn/service';
import {
  readWireSignatureHeader,
  verifyWirePaymentSignature,
} from '@/lib/wiremn/webhook-verify';
import type { PaymentMethod, InvoiceFeeType } from '@/types';
import { INVOICE_FEE_TYPES } from '@/lib/fees/apartment-fees';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type WireDataShape = {
  id?: string;
  amount?: number | string | null;
  currency?: string;
  status?: string;
  state?: string;
  reference?: string;
  link_id?: string;
  link?: { id?: string };
  metadata?: Record<string, unknown> | null;
  transaction_id?: string;
  description?: string | null;
  object?: WireDataShape | null;
};

type WirePayloadShape = {
  id?: string;
  event?: string;
  type?: string;
  data?: WireDataShape | null;
  amount?: number | string | null;
  status?: string;
  state?: string;
  reference?: string;
  metadata?: Record<string, unknown> | null;
  [k: string]: unknown;
};

function resolveWireData(root: WirePayloadShape): WireDataShape {
  const data = root.data ?? {};
  if (data.object && typeof data.object === 'object') {
    return data.object;
  }
  return data;
}

const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function extractPayload(root: WirePayloadShape): {
  event: string;
  amount: number;
  status: string;
  reference: string | null;
  linkId: string | null;
  metadata: Record<string, unknown>;
  transactionId: string | null;
  currency: string;
} {
  const data = resolveWireData(root);
  const rawEvent =
    typeof root.event === 'string' && root.event.length
      ? root.event
      : typeof root.type === 'string' && root.type.length
        ? root.type
        : 'unknown';
  const rawAmount = data.amount ?? root.amount ?? 0;
  const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : (rawAmount as number) || 0;
  const statusRaw = data.status ?? data.state ?? root.status ?? root.state ?? 'unknown';
  const status = String(statusRaw ?? 'unknown').toLowerCase();
  const reference = (data.reference ?? root.reference ?? null) as string | null;
  const linkId = (data.link_id ?? data.link?.id ?? null) as string | null;
  const metadata = (data.metadata ?? root.metadata ?? {}) as Record<string, unknown>;
  const transactionId = (data.transaction_id ?? data.id ?? root.id ?? null) as string | null;
  const currency = String(data.currency ?? 'MNT').toUpperCase();
  return { event: rawEvent, amount, status, reference, linkId, metadata, transactionId, currency };
}

function parseApartmentUser(
  reference: string | null,
  metadata: Record<string, unknown>,
): { apartmentId: string | null; userId: string | null } {
  let apartmentId: string | null = null;
  let userId: string | null = null;

  const md = metadata ?? {};
  const mdApt = md as { apartment_id?: string; apartmentId?: string };
  const mdUser = md as { user_id?: string; userId?: string };

  apartmentId = (mdApt?.apartment_id as string) ?? (mdApt?.apartmentId as string) ?? null;
  userId = (mdUser.user_id as string) ?? (mdUser.userId as string) ?? null;

  if (!apartmentId && reference?.startsWith('apt:')) {
    const m = reference.match(/^apt:([0-9a-f-]{36})/i);
    if (m) apartmentId = m[1];
    else apartmentId = reference.slice(4).split(':')[0] ?? null;
  }

  if (!apartmentId && reference) {
    const m = reference.match(UUID_REGEX);
    if (m) apartmentId = m[0];
  }

  return { apartmentId, userId };
}

function parseFeeTypes(metadata: Record<string, unknown>): InvoiceFeeType[] | undefined {
  const raw = metadata.fee_types ?? metadata.feeTypes;
  if (Array.isArray(raw)) {
    const types = raw.filter((t): t is InvoiceFeeType =>
      typeof t === 'string' && INVOICE_FEE_TYPES.includes(t as InvoiceFeeType),
    );
    return types.length ? types : undefined;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const types = raw
      .split(',')
      .map((s) => s.trim())
      .filter((t): t is InvoiceFeeType => INVOICE_FEE_TYPES.includes(t as InvoiceFeeType));
    return types.length ? types : undefined;
  }
  return undefined;
}

function isPaidStatus(status: string, event: string): boolean {
  const s = status.toLowerCase();
  const e = event.toLowerCase();
  if (
    ['successful', 'succeeded', 'success', 'paid', 'completed', 'confirmed', 'captured'].includes(s)
  ) {
    return true;
  }
  if (
    e.includes('succeeded') ||
    e.includes('paid') ||
    e.includes('completed') ||
    e.includes('success')
  ) {
    return true;
  }
  return false;
}

function isFailedOrCancelled(status: string, event: string): boolean {
  const s = status.toLowerCase();
  const e = event.toLowerCase();
  if (['failed', 'cancelled', 'canceled', 'expired', 'declined', 'error'].includes(s)) return true;
  if (e.includes('failed') || e.includes('cancel')) return true;
  return false;
}

export async function POST(req: Request): Promise<NextResponse> {
  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const signature = readWireSignatureHeader(req.headers);

  if (!verifyWirePaymentSignature(rawBody, signature, WIRE_MN_WEBHOOK_SECRET)) {
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 });
  }

  let payload: WirePayloadShape;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as WirePayloadShape) : ({} as WirePayloadShape);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const extracted = extractPayload(payload);
  const { apartmentId, userId } = parseApartmentUser(extracted.reference, extracted.metadata);
  const feeTypes = parseFeeTypes(extracted.metadata);

  const isPaid = isPaidStatus(extracted.status, extracted.event);
  const isFailed = isFailedOrCancelled(extracted.status, extracted.event);

  if (isFailed) {
    return NextResponse.json({
      ok: true,
      handled: true,
      action: 'ignored_failed',
      reason: 'failed_or_cancelled',
    });
  }

  if (!isPaid) {
    return NextResponse.json({
      ok: true,
      handled: false,
      action: 'ignored',
      event: extracted.event,
      status: extracted.status,
    });
  }

  if (!apartmentId || extracted.amount <= 0) {
    return NextResponse.json(
      {
        ok: false,
        handled: false,
        error: 'missing_payload',
        apartment_id: apartmentId,
        amount: extracted.amount,
      },
      { status: 422 },
    );
  }

  const apartment = await getApartmentById(apartmentId);
  if (!apartment) {
    return NextResponse.json(
      { ok: false, handled: false, error: 'apartment_not_found', apartment_id: apartmentId },
      { status: 404 },
    );
  }

  const idempotencyKey = extracted.transactionId ?? payload.id ?? randomUUID();

  const existing = idempotencyKey ? await getPaymentByWireTransactionId(idempotencyKey) : null;
  if (existing) {
    return NextResponse.json({
      ok: true,
      handled: true,
      action: 'idempotent_skip',
      payment_id: existing.id,
    });
  }

  const amount =
    extracted.currency === 'MNT' || !extracted.currency ? extracted.amount : extracted.amount;

  const result = await applyApartmentPayment({
    organizationId: apartment.organization_id,
    apartmentId: apartment.id,
    amount,
    paymentMethod: 'CARD' as PaymentMethod,
    transactionId: idempotencyKey,
    paidAt: new Date().toISOString(),
    createdBy: null,
    metadata: {
      wire_event: extracted.event,
      wire_link_id: extracted.linkId,
      wire_reference: extracted.reference,
      wire_transaction_id: extracted.transactionId,
      wire_currency: extracted.currency,
      source: 'wiremn-webhook',
      original_metadata: extracted.metadata,
      reported_by_user_id: userId,
    },
    idempotencyKey,
    feeTypes,
  });

  try {
    revalidatePath('/resident/payments');
    revalidatePath('/resident/vehicle');
    revalidatePath('/resident');
    revalidatePath('/admin/payments');
    revalidatePath('/admin/invoices');
    revalidatePath('/admin/vehicles');
    revalidatePath('/admin/gate-access');
    revalidatePath(`/admin/apartments/${apartment.id}`);
  } catch {
    // revalidation is best-effort
  }

  return NextResponse.json({
    ok: true,
    handled: true,
    action: 'applied',
    payments_count: result.payments.length,
    invoices_updated: result.invoicesUpdated.length,
    apartment_debt: result.apartmentDebt,
    remaining_unapplied: result.remainingUnapplied,
    vehicle_access_changed: result.vehicleAccessChanged,
  });
}

export async function GET(): Promise<NextResponse> {
  if (!WIRE_MN_API_KEY && !WIRE_MN_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: 'wiremn_not_configured' }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    configured: Boolean(WIRE_MN_API_KEY || WIRE_MN_WEBHOOK_SECRET),
    has_secret: Boolean(WIRE_MN_WEBHOOK_SECRET),
    hint: 'POST /api/wiremn/webhook endpoint is live',
  });
}
