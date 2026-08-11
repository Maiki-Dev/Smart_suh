import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { ApartmentManagement } from '@/components/admin/ApartmentManagement';
import { listApartmentsAdminView } from '@/lib/queries/apartments';
import { parseTablePagination } from '@/lib/admin/pagination';
import type { ApartmentStatus } from '@/types';

export default async function AdminApartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; building?: string; status?: string; page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const { page, limit, offset } = parseTablePagination(params);
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);

  const searchParts = [params.q, params.building].filter(Boolean).join(' ').trim();

  const apartmentsRes = await listApartmentsAdminView(orgScope, {
    search: searchParts || undefined,
    status: (params.status as ApartmentStatus | undefined) || undefined,
    limit,
    offset,
  });

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="apartments"
        pageTitle="Орон сууц"
        pageSubtitle="Орон сууцны бүртгэл, хайлт, шүүлт"
      >
        <ApartmentManagement
          apartments={apartmentsRes.data}
          filters={{
            q: params.q,
            building: params.building,
            status: params.status,
          }}
          total={apartmentsRes.total}
          page={page}
          limit={limit}
        />
      </AdminShell>
    </>
  );
}
