import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ResidentManagement } from '@/components/admin/ResidentManagement';
import { listApartmentsAdminView } from '@/lib/queries/apartments';
import { listResidentsAdminView } from '@/lib/queries/residents';
import { parseTablePagination } from '@/lib/admin/pagination';
import type { ResidentStatus } from '@/types';

export default async function AdminResidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; apartment?: string; new?: string; page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const { page, limit, offset } = parseTablePagination(params);
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);

  const [residentsRes, apartmentsRes] = await Promise.all([
    listResidentsAdminView(orgScope, {
      search: params.q,
      status: (params.status as ResidentStatus | undefined) || undefined,
      limit,
      offset,
    }),
    listApartmentsAdminView(orgScope, { limit: 500 }),
  ]);

  return (
      <AdminShell
        ctx={ctx}
        activeSegment="residents"
        pageTitle="Орон сууц"
        pageSubtitle="Орон сууц болон оршин суугчийн бүртгэл"
      >
        <ResidentManagement
          residents={residentsRes.data}
          apartments={apartmentsRes.data}
          filters={{
            q: params.q,
            status: params.status,
          }}
          total={residentsRes.total}
          page={page}
          limit={limit}
          defaultApartmentId={params.apartment || undefined}
          openCreateOnMount={params.new === '1'}
        />
      </AdminShell>
  );
}
