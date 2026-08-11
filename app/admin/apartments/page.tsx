import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { ApartmentManagement } from '@/components/admin/ApartmentManagement';
import { listApartmentsAdminView } from '@/lib/queries/apartments';
import { listBuildingsByOrganization } from '@/lib/queries/buildings';
import type { ApartmentStatus } from '@/types';

export default async function AdminApartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; building?: string; status?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);
  const orgId = orgScope ?? ctx.user.organization_id;

  const [apartmentsRes, buildingsRes] = await Promise.all([
    listApartmentsAdminView(orgScope, {
      search: params.q,
      building_id: params.building || undefined,
      status: (params.status as ApartmentStatus | undefined) || undefined,
      limit: 200,
    }),
    listBuildingsByOrganization(orgId, { limit: 100 }),
  ]);

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
          buildings={buildingsRes.data}
          filters={{
            q: params.q,
            building: params.building,
            status: params.status,
          }}
          total={apartmentsRes.total}
        />
      </AdminShell>
    </>
  );
}
