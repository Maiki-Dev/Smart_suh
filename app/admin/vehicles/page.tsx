import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { VehicleManagement } from '@/components/admin/VehicleManagement';
import { listApartmentsAdminView } from '@/lib/queries/apartments';
import { listVehiclesAdminView } from '@/lib/queries/vehicles';

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; active?: string; gate?: string; apartment?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);

  const [vehiclesRes, apartmentsRes] = await Promise.all([
    listVehiclesAdminView(orgScope, {
      search: params.q,
      active: params.active === 'true' ? true : params.active === 'false' ? false : undefined,
      gate_access: params.gate === 'true' ? true : params.gate === 'false' ? false : undefined,
      apartment_id: params.apartment || undefined,
      limit: 200,
    }),
    listApartmentsAdminView(orgScope ?? ctx.user.organization_id, { limit: 500 }),
  ]);

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="vehicles"
        pageTitle="Машин"
        pageSubtitle="Орон сууц бүрт нэг үндсэн машин, гацааны эрх автоматаар"
      >
        <VehicleManagement
          vehicles={vehiclesRes.data}
          apartments={apartmentsRes.data}
          filters={{
            q: params.q,
            active: params.active,
            gate: params.gate,
            apartment: params.apartment,
          }}
          total={vehiclesRes.total}
        />
      </AdminShell>
    </>
  );
}
