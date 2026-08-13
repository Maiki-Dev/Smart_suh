import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { IncidentsDashboard } from '@/components/admin/IncidentsDashboard';
import { getIncidentDashboardStats, listIncidentsAdmin } from '@/lib/queries/incidents';

export default async function AdminIncidentsPage() {
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);
  const orgId = orgScope ?? ctx.user.organization_id;

  const [stats, incidentsRes] = await Promise.all([
    getIncidentDashboardStats(orgId),
    listIncidentsAdmin(orgScope, { limit: 100 }),
  ]);

  return (
      <AdminShell
        ctx={ctx}
        activeSegment="incidents"
        pageTitle="Building Incidents"
        pageSubtitle="AI Incident Detector & Smart Clustering"
      >
        <IncidentsDashboard stats={stats} incidents={incidentsRes.data} />
      </AdminShell>
  );
}
