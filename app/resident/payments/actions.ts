'use server';

import { requireRole } from '@/lib/permissions';
import { getResidentOverviewStats } from '@/lib/queries/dashboard';
import { listInvoicesByApartment } from '@/lib/queries/invoices';
import {
  INVOICE_FEE_TYPES,
  invoiceFeeTypeLabel,
  remainingFeeBreakdownFromInvoices,
  sumRemainingForFeeTypes,
} from '@/lib/fees/apartment-fees';
import { resolvePaymentUrlAsync } from '@/lib/wiremn/service';
import { syncWirePaymentIntent } from '@/lib/wiremn/sync-payment-intent';
import type { InvoiceFeeType } from '@/types';

export type ResidentWirePaymentState =
  | { ok: true; url: string }
  | { ok: false; message: string };

function parseFeeTypesInput(raw: string[]): InvoiceFeeType[] {
  return raw.filter((t): t is InvoiceFeeType =>
    INVOICE_FEE_TYPES.includes(t as InvoiceFeeType),
  );
}

export async function createResidentWirePaymentAction(
  feeTypes: string[],
): Promise<ResidentWirePaymentState> {
  const ctx = await requireRole(['RESIDENT']);
  const selected = parseFeeTypesInput(feeTypes);
  if (selected.length === 0) {
    return { ok: false, message: 'Дор хаяж нэг төлбөр сонгоно уу.' };
  }

  const overview = await getResidentOverviewStats(ctx.user.organization_id, ctx.user.id);
  const aptId = overview.apartment?.id;
  if (!aptId) {
    return { ok: false, message: 'Орон сууц холбогдоогүй.' };
  }

  const { data: invoices } = await listInvoicesByApartment(aptId, { limit: 200 });
  const remaining = remainingFeeBreakdownFromInvoices(invoices);
  const amount = sumRemainingForFeeTypes(remaining, selected);

  if (amount <= 0) {
    return {
      ok: false,
      message: `${selected.map(invoiceFeeTypeLabel).join(', ')} төлбөрт үлдэгдэл байхгүй.`,
    };
  }

  const apartmentLabel = overview.apartment
    ? [overview.apartment.tower, overview.apartment.apartment_number].filter(Boolean).join(' · ')
    : '—';

  const feeLabel = selected.map(invoiceFeeTypeLabel).join(', ');
  const description = apartmentLabel
    ? `СӨХ — ${feeLabel} (${apartmentLabel})`
    : `СӨХ — ${feeLabel}`;

  const payRes = await resolvePaymentUrlAsync({
    fallbackAmount: amount,
    description,
    reference: `apt:${aptId}`,
    apartmentId: aptId,
    residentUserId: ctx.user.id,
    successRedirectPath: '/resident/payments',
    failRedirectPath: '/resident/payments',
    feeTypes: selected,
  });

  if (payRes.unavailable || payRes.url === '#') {
    return {
      ok: false,
      message:
        payRes.wireError ??
        'Wire.mn тохиргоо дутуу байна. Админд мэдэгдэнэ үү.',
    };
  }

  return { ok: true, url: payRes.url };
}

export async function syncResidentWirePaymentAction(
  paymentIntentId: string,
): Promise<
  | { ok: true; status: 'applied' | 'already_recorded' }
  | { ok: true; status: 'pending'; wireStatus: string }
  | { ok: false; message: string }
> {
  const ctx = await requireRole(['RESIDENT']);
  const overview = await getResidentOverviewStats(ctx.user.organization_id, ctx.user.id);
  const aptId = overview.apartment?.id;
  if (!aptId) {
    return { ok: false, message: 'Орон сууц холбогдоогүй.' };
  }

  const result = await syncWirePaymentIntent(paymentIntentId, {
    expectedApartmentId: aptId,
    expectedUserId: ctx.user.id,
  });

  switch (result.status) {
    case 'applied':
    case 'already_recorded':
      return { ok: true, status: result.status };
    case 'pending':
      return { ok: true, status: 'pending', wireStatus: result.wireStatus };
    case 'forbidden':
      return { ok: false, message: 'Энэ төлбөрийг бүртгэх эрхгүй.' };
    case 'not_found':
      return { ok: false, message: 'Төлбөрийн мэдээлэл олдсонгүй.' };
    default:
      return { ok: false, message: 'Төлбөр бүртгэхэд алдаа гарлаа.' };
  }
}
