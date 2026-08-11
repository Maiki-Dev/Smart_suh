import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { PaymentManagement } from '@/components/admin/PaymentManagement';
import { listPaymentsAdminView } from '@/lib/queries/payments';
import { listInvoicesAdminView } from '@/lib/queries/invoices';
import { parseTablePagination } from '@/lib/admin/pagination';
import type { PaymentMethod } from '@/types';

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; method?: string; page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const { page, limit, offset } = parseTablePagination(params);
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);

  const [paymentsRes, invoicesRes] = await Promise.all([
    listPaymentsAdminView(orgScope, {
      search: params.q,
      payment_method: (params.method as PaymentMethod | undefined) || undefined,
      limit,
      offset,
    }),
    listInvoicesAdminView(orgScope, { limit: 500 }),
  ]);

  const openInvoices = invoicesRes.data
    .filter((inv) => !['PAID', 'CANCELLED'].includes(inv.status))
    .map((inv) => ({
      id: inv.id,
      label: `${inv.invoice_number} · ${inv.apartment_number} · үлд ${inv.remaining_amount.toLocaleString('mn-MN')}₮`,
      remaining_amount: inv.remaining_amount,
    }));

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="payments"
        pageTitle="Төлбөр"
        pageSubtitle="Гараар төлбөр бүртгэх, түүх харах"
      >
        <PaymentManagement
          payments={paymentsRes.data}
          openInvoices={openInvoices}
          filters={{ q: params.q, method: params.method }}
          total={paymentsRes.total}
          page={page}
          limit={limit}
        />
      </AdminShell>
    </>
  );
}
