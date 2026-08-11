import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { VisitorManagement } from '@/components/admin/VisitorManagement';
import { listVisitorPassesAdminView } from '@/lib/queries/visitors';
import { listApartmentsAdminView } from '@/lib/queries/apartments';
import { parseTablePagination } from '@/lib/admin/pagination';
import type { PassStatus } from '@/types';

export default async function AdminVisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; apartment?: string; from?: string; to?: string; page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const { page, limit, offset } = parseTablePagination(params);
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);

  const [visitorsRes, apartmentsRes] = await Promise.all([
    listVisitorPassesAdminView(orgScope, {
      search: params.q,
      status: params.status as PassStatus | undefined,
      apartment_id: params.apartment || undefined,
      date_from: params.from || undefined,
      date_to: params.to || undefined,
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
        activeSegment="visitors"
        pageTitle="Зочид"
        pageSubtitle="Зочны эрх, хайлт, шүүлт"
      >
        <VisitorManagement
          passes={visitorsRes.data}
          apartments={apartmentsRes.data}
          filters={{
            q: params.q,
            status: params.status,
            apartment: params.apartment,
            from: params.from,
            to: params.to,
          }}
          total={visitorsRes.total}
          page={page}
          limit={limit}
        />
      </AdminShell>
    </>
  );
}
