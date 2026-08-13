import 'server-only';

import { revalidatePath } from 'next/cache';
import { getApartmentById } from '@/lib/queries/apartments';
import {
  applyApartmentPayment,
  getPaymentByWireTransactionId,
} from '@/lib/payments/apply-apartment-payment';
import { INVOICE_FEE_TYPES } from '@/lib/fees/apartment-fees';
import { WIRE_MN_API_BASE, WIRE_MN_API_KEY } from '@/lib/wiremn/service';
import type { InvoiceFeeType, PaymentMethod } from '@/types';

export interface WirePaymentIntentDetail {
  id: string;
  amount: number;
  currency?: string;
  status?: string;
  reference?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type SyncWirePaymentResult =
  | { status: 'applied'; paymentsCount: number; apartmentDebt: number }
  | { status: 'already_recorded' }
  | { status: 'pending'; wireStatus: string }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'error'; message: string };

function authHeaders(): Record<string, string> {
  if (!WIRE_MN_API_KEY) return {};
  return { Authorization: `Bearer ${WIRE_MN_API_KEY}` };
}

export async function retrievePaymentIntent(
  paymentIntentId: string,
): Promise<WirePaymentIntentDetail | null> {
  if (!WIRE_MN_API_KEY || !paymentIntentId.trim()) return null;

  try {
    const res = await fetch(
      `${WIRE_MN_API_BASE}/payment_intents/${encodeURIComponent(paymentIntentId.trim())}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json', ...authHeaders() },
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;

    const json = (await res.json()) as WirePaymentIntentDetail | { data?: WirePaymentIntentDetail };
    if (json && typeof json === 'object' && 'data' in json && json.data) {
      return json.data;
    }
    return json as WirePaymentIntentDetail;
  } catch {
    return null;
  }
}

function isWirePaymentSucceeded(status: string | undefined): boolean {
  const s = String(status ?? '').toLowerCase();
  return ['succeeded', 'successful', 'success', 'paid', 'completed', 'confirmed', 'captured'].includes(
    s,
  );
}

function parseFeeTypes(metadata: Record<string, unknown> | null | undefined): InvoiceFeeType[] | undefined {
  if (!metadata) return undefined;
  const raw = metadata.fee_types ?? metadata.feeTypes;
  if (typeof raw === 'string' && raw.trim()) {
    const types = raw
      .split(',')
      .map((s) => s.trim())
      .filter((t): t is InvoiceFeeType => INVOICE_FEE_TYPES.includes(t as InvoiceFeeType));
    return types.length ? types : undefined;
  }
  if (Array.isArray(raw)) {
    const types = raw.filter(
      (t): t is InvoiceFeeType =>
        typeof t === 'string' && INVOICE_FEE_TYPES.includes(t as InvoiceFeeType),
    );
    return types.length ? types : undefined;
  }
  return undefined;
}

function parseApartmentId(
  reference: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const md = metadata ?? {};
  const fromMeta =
    (md.apartment_id as string | undefined) ?? (md.apartmentId as string | undefined) ?? null;
  if (fromMeta) return fromMeta;

  if (reference?.startsWith('apt:')) {
    const m = reference.match(/^apt:([0-9a-f-]{36})/i);
    if (m) return m[1];
  }
  return null;
}

function revalidatePaymentPaths(apartmentId: string): void {
  try {
    revalidatePath('/resident/payments');
    revalidatePath('/resident/vehicle');
    revalidatePath('/resident');
    revalidatePath('/admin/payments');
    revalidatePath('/admin/invoices');
    revalidatePath('/admin/vehicles');
    revalidatePath('/admin/gate-access');
    revalidatePath(`/admin/apartments/${apartmentId}`);
  } catch {
    // best-effort
  }
}

export async function syncWirePaymentIntent(
  paymentIntentId: string,
  opts?: { expectedApartmentId?: string; expectedUserId?: string },
): Promise<SyncWirePaymentResult> {
  const id = paymentIntentId.trim();
  if (!id) return { status: 'error', message: 'payment_intent_id_missing' };

  const existing = await getPaymentByWireTransactionId(id);
  if (existing) return { status: 'already_recorded' };

  const intent = await retrievePaymentIntent(id);
  if (!intent?.id) return { status: 'not_found' };

  if (!isWirePaymentSucceeded(intent.status)) {
    return { status: 'pending', wireStatus: String(intent.status ?? 'unknown') };
  }

  const metadata = intent.metadata ?? {};
  const apartmentId = parseApartmentId(intent.reference ?? null, metadata);
  if (!apartmentId) {
    return { status: 'error', message: 'apartment_id_missing_in_intent' };
  }

  if (opts?.expectedApartmentId && opts.expectedApartmentId !== apartmentId) {
    return { status: 'forbidden' };
  }

  const apartment = await getApartmentById(apartmentId);
  if (!apartment) return { status: 'error', message: 'apartment_not_found' };

  const amount = Number(intent.amount ?? 0);
  if (amount <= 0) return { status: 'error', message: 'invalid_amount' };

  const feeTypes = parseFeeTypes(metadata);
  const userId =
    (metadata.user_id as string | undefined) ?? (metadata.userId as string | undefined) ?? null;

  if (opts?.expectedUserId && userId && opts.expectedUserId !== userId) {
    return { status: 'forbidden' };
  }

  const result = await applyApartmentPayment({
    organizationId: apartment.organization_id,
    apartmentId: apartment.id,
    amount,
    paymentMethod: 'CARD' as PaymentMethod,
    transactionId: intent.id,
    paidAt: new Date().toISOString(),
    createdBy: null,
    metadata: {
      source: 'wiremn-sync',
      wire_payment_intent_id: intent.id,
      wire_reference: intent.reference,
      wire_currency: intent.currency,
      original_metadata: metadata,
      reported_by_user_id: userId,
    },
    idempotencyKey: intent.id,
    feeTypes,
  });

  revalidatePaymentPaths(apartment.id);

  return {
    status: 'applied',
    paymentsCount: result.payments.length,
    apartmentDebt: result.apartmentDebt,
  };
}

export function buildWireSuccessRedirectUrl(basePath: string, paymentIntentId: string): string {
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}status=success&source=wiremn&pi=${encodeURIComponent(paymentIntentId)}`;
}
