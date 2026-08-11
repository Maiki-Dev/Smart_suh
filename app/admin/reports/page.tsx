import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { ReportsDashboard } from '@/components/admin/ReportsDashboard';
import { listBuildingsByOrganization } from '@/lib/queries/buildings';
import { listApartmentsAdminView } from '@/lib/queries/apartments';
import {
  getFinancialReport,
  getPaymentMethodReport,
  getVehicleReport,
  getMaintenanceReport,
  getResidentReport,
} from '@/lib/queries/reports';

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    building?: string;
    tower?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const params = await searchParams;
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);
  const orgId = orgScope ?? ctx.user.organization_id;

  const reportFilters = {
    organizationId: orgId,
    buildingId: params.building || undefined,
    tower: params.tower || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };

  const [financial, paymentMethods, vehicles, maintenance, residents, buildingsRes, apartmentsRes] =
    await Promise.all([
      getFinancialReport(reportFilters),
      getPaymentMethodReport(reportFilters),
      getVehicleReport(reportFilters),
      getMaintenanceReport(reportFilters),
      getResidentReport(reportFilters),
      listBuildingsByOrganization(orgId, { limit: 100 }),
      listApartmentsAdminView(orgScope, { limit: 500 }),
    ]);

  const towers = [
    ...new Set(
      apartmentsRes.data
        .map((a) => a.tower)
        .filter((t): t is string => !!t),
    ),
  ].sort();

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="reports"
        pageTitle="Тайлан"
        pageSubtitle="Санхүү, төлбөр, машин, засвар, оршин суугчийн тайлан"
      >
        <ReportsDashboard
          financial={financial}
          paymentMethods={paymentMethods}
          vehicles={vehicles}
          maintenance={maintenance}
          residents={residents}
          buildings={buildingsRes.data}
          towers={towers}
          filters={{
            building: params.building,
            tower: params.tower,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
          }}
        />
      </AdminShell>
    </>
  );
}
