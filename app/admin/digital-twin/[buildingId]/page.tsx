import { notFound } from 'next/navigation';
import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId, assertOrganizationAccess } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { DigitalTwinBuildingMap } from '@/components/admin/digital-twin/DigitalTwinBuildingMap';
import { getBuildingTwinData } from '@/lib/queries/digital-twin';
import { getBuildingById } from '@/lib/queries/buildings';

export default async function DigitalTwinBuildingPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);
  const orgId = orgScope ?? ctx.user.organization_id;
  const { buildingId } = await params;

  const building = await getBuildingById(buildingId);
  if (!building) notFound();
  await assertOrganizationAccess(ctx, building.organization_id);

  const initialData = await getBuildingTwinData(buildingId, orgId);
  if (!initialData) notFound();

  return (
      <AdminShell
        ctx={ctx}
        activeSegment="digital-twin"
        pageTitle={building.name}
        pageSubtitle="Smart Building Live Map"
      >
        <DigitalTwinBuildingMap
          buildingId={buildingId}
          initialData={initialData}
        />
      </AdminShell>
  );
}
