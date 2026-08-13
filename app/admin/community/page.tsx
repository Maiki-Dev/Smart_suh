import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { CommunityDashboard } from '@/components/admin/CommunityDashboard';
import {
  getCommunityDashboardStats,
  listProposalsAdmin,
} from '@/lib/queries/community';
import { getOrCreateReserveFund } from '@/lib/community/reserve-fund';
import { query } from '@/lib/db';
import type { Building } from '@/types';

export default async function AdminCommunityPage() {
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);
  const orgId = orgScope ?? ctx.user.organization_id;

  const [stats, proposalsRes, reserveFund] = await Promise.all([
    getCommunityDashboardStats(orgId),
    listProposalsAdmin(orgScope),
    getOrCreateReserveFund(orgId),
  ]);

  const { rows: buildings } = await query<Building>(
    `SELECT id, organization_id, name, address, created_at, updated_at FROM buildings WHERE organization_id = $1 ORDER BY name`,
    [orgId],
  );

  return (
      <AdminShell
        ctx={ctx}
        activeSegment="community"
        pageTitle="Хамтын шийдвэр"
        pageSubtitle="Санал хураалт, төсөв, төсөл удирдах"
      >
        <CommunityDashboard
          stats={stats}
          proposals={proposalsRes.data}
          reserveFund={reserveFund}
          buildings={buildings}
        />
      </AdminShell>
  );
}
