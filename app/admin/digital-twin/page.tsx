import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { DigitalTwinOverview } from '@/components/admin/digital-twin/DigitalTwinOverview';
import { listBuildingTwinOverviews } from '@/lib/queries/digital-twin';

export default async function DigitalTwinPage() {
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);
  const orgId = orgScope ?? ctx.user.organization_id;

  const buildings = await listBuildingTwinOverviews(orgId);

  return (
      <AdminShell
        ctx={ctx}
        activeSegment="digital-twin"
        pageTitle="Digital Twin"
        pageSubtitle="Smart Building Live Map"
      >
        <DigitalTwinOverview buildings={buildings} />
      </AdminShell>
  );
}
