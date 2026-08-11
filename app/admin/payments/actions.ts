'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import { recordPayment } from '@/lib/payments/record-payment';
import { getInvoiceById } from '@/lib/queries/invoices';
import type { PaymentMethod } from '@/types';

export type PaymentActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const paymentSchema = z.object({
  invoice_id: z.string().uuid('Нэхэмжлэл сонгоно уу'),
  amount: z.coerce.number().positive('Төлбөрийн дүн 0-ээс их байх ёстой'),
  payment_method: z.enum([
    'CASH',
    'BANK_TRANSFER',
    'QPAY',
    'SOCIALPAY',
    'CARD',
    'OTHER',
  ] as [PaymentMethod, ...PaymentMethod[]]),
  transaction_id: z.string().max(255).optional().nullable(),
});

export async function recordPaymentAction(
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const ctx = await requireAdminRole();
  const raw = Object.fromEntries(formData.entries());
  const parsed = paymentSchema.safeParse({
    ...raw,
    transaction_id: raw.transaction_id || null,
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const invoice = await getInvoiceById(parsed.data.invoice_id);
  if (!invoice) return { status: 'error', message: 'Нэхэмжлэл олдсонгүй' };
  assertOrganizationAccess(ctx, invoice.organization_id);

  try {
    const result = await recordPayment({
      organizationId: invoice.organization_id,
      apartmentId: invoice.apartment_id,
      invoiceId: invoice.id,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.payment_method,
      transactionId: parsed.data.transaction_id ?? null,
      createdBy: ctx.user.id,
    });

    revalidatePath('/admin/payments');
    revalidatePath('/admin/invoices');
    revalidatePath(`/admin/invoices/${invoice.id}`);
    revalidatePath('/resident/payments');
    revalidatePath('/resident/vehicle');
    revalidatePath('/admin/apartments');
    revalidatePath('/admin/vehicles');
    revalidatePath('/admin/gate-access');
    return {
      status: 'success',
      message: `Төлбөр бүртгэгдлээ. Орон сууцны үлдэгдэл: ${result.apartmentDebt.toLocaleString('mn-MN')}₮`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function listOpenInvoicesAction() {
  const ctx = await requireAdminRole();
  const { listInvoicesAdminView } = await import('@/lib/queries/invoices');
  const orgScope = ctx.user.role === 'SUPER_ADMIN' ? null : ctx.user.organization_id;
  const { data } = await listInvoicesAdminView(orgScope, {
    limit: 500,
    orderBy: 'billing_year',
    orderDirection: 'DESC',
  });

  return data
    .filter((inv) => !['PAID', 'CANCELLED'].includes(inv.status))
    .map((inv) => ({
      id: inv.id,
      label: `${inv.invoice_number} · ${inv.apartment_number} · үлд ${inv.remaining_amount.toLocaleString('mn-MN')}₮`,
      apartment_id: inv.apartment_id,
      remaining_amount: inv.remaining_amount,
    }));
}
