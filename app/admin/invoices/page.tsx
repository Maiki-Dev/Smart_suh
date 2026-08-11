import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { InvoiceManagement } from '@/components/admin/InvoiceManagement';
import { listApartmentsAdminView } from '@/lib/queries/apartments';
import { listInvoicesAdminView } from '@/lib/queries/invoices';
import { parseTablePagination } from '@/lib/admin/pagination';
import type { InvoiceStatus } from '@/types';

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    year?: string;
    month?: string;
    apartment?: string;
    page?: string;
    limit?: string;
  }>;
}) {
  const params = await searchParams;
  const { page, limit, offset } = parseTablePagination(params);
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);

  const [invoicesRes, apartmentsRes] = await Promise.all([
    listInvoicesAdminView(orgScope, {
      search: params.q,
      status: (params.status as InvoiceStatus | undefined) || undefined,
      billing_year: params.year ? Number(params.year) : undefined,
      billing_month: params.month ? Number(params.month) : undefined,
      apartment_id: params.apartment || undefined,
      limit,
      offset,
    }),
    listApartmentsAdminView(orgScope ?? ctx.user.organization_id, { limit: 500 }),
  ]);

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="invoices"
        pageTitle="Нэхэмжлэл"
        pageSubtitle="Сарын нэхэмжлэл, төлбөрийн төлөв"
      >
        <InvoiceManagement
          invoices={invoicesRes.data}
          apartments={apartmentsRes.data}
          filters={{
            q: params.q,
            status: params.status,
            year: params.year,
            month: params.month,
            apartment: params.apartment,
          }}
          total={invoicesRes.total}
          page={page}
          limit={limit}
        />
      </AdminShell>
    </>
  );
}
