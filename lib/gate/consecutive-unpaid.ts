import type { Invoice } from '@/types';

export function isInvoiceUnpaidForGate(invoice: Pick<Invoice, 'status' | 'remaining_amount' | 'paid_amount' | 'amount'>): boolean {
  if (invoice.status === 'CANCELLED' || invoice.status === 'PAID') return false;
  return Number(invoice.remaining_amount) > 0;
}

/** Count trailing consecutive unpaid months after chronological invoice scan. */
export function countConsecutiveUnpaidMonths(
  invoices: Pick<Invoice, 'billing_year' | 'billing_month' | 'status' | 'remaining_amount' | 'paid_amount' | 'amount'>[],
): number {
  const sorted = [...invoices]
    .filter((inv) => inv.status !== 'CANCELLED')
    .sort((a, b) => {
      if (a.billing_year !== b.billing_year) return a.billing_year - b.billing_year;
      return a.billing_month - b.billing_month;
    });

  let streak = 0;
  for (const invoice of sorted) {
    if (isInvoiceUnpaidForGate(invoice)) {
      streak += 1;
    } else {
      streak = 0;
    }
  }
  return streak;
}

export function shouldDisableGateAccess(consecutiveUnpaidMonths: number): boolean {
  return consecutiveUnpaidMonths >= 2;
}

export const GATE_DISABLED_REASON =
  'СӨХ-ийн төлбөр 2 сар дараалан төлөгдөөгүй.';

export const GATE_RESTORED_MESSAGE =
  'Төлбөр шинэчлэгдсэн тул хаалгаар нэвтрэх эрх автоматаар сэргээгдлээ.';
