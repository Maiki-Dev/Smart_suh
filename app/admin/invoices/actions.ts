'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess, getScopedOrganizationId } from '@/lib/admin/org-scope';
import {
  cancelInvoice,
  generateMonthlyInvoices,
  getInvoiceById,
} from '@/lib/queries/invoices';

export type InvoiceActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export async function cancelInvoiceAction(invoiceId: string): Promise<InvoiceActionState> {
  const ctx = await requireAdminRole();
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) return { status: 'error', message: 'Нэхэмжлэл олдсонгүй' };
  assertOrganizationAccess(ctx, invoice.organization_id);

  try {
    await cancelInvoice(invoiceId, ctx.user.id);
    revalidatePath('/admin/invoices');
    revalidatePath(`/admin/invoices/${invoiceId}`);
    revalidatePath('/admin/payments');
    revalidatePath('/resident/payments');
    return { status: 'success', message: 'Нэхэмжлэл цуцлагдлаа' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function generateMonthlyInvoicesAction(): Promise<InvoiceActionState & {
  summary?: string;
}> {
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);

  try {
    const results = await generateMonthlyInvoices({
      organizationId: orgScope ?? ctx.user.organization_id,
    });
    const summary = results
      .map(
        (r) =>
          `${r.billing_year}/${r.billing_month}: ${r.created} үүссэн, ${r.skipped} алгассан` +
          (r.errors.length ? `, ${r.errors.length} алдаа` : ''),
      )
      .join('; ');

    revalidatePath('/admin/invoices');
    revalidatePath('/admin/payments');
    revalidatePath('/resident/payments');
    return { status: 'success', message: 'Сарын нэхэмжлэл үүслээ', summary };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}
