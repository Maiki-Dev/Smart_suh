import { notFound } from 'next/navigation';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { IncidentDetailPanel } from '@/components/admin/IncidentDetailPanel';
import {
  getIncidentById,
  listIncidentIssues,
  listIncidentTimeline,
  listAffectedAreas,
} from '@/lib/queries/incidents';
import { query } from '@/lib/db';

export default async function AdminIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdminRole();
  const incident = await getIncidentById(id);
  if (!incident) notFound();
  assertOrganizationAccess(ctx, incident.organization_id);

  const [issues, timeline, affectedAreas] = await Promise.all([
    listIncidentIssues(id),
    listIncidentTimeline(id),
    listAffectedAreas(id),
  ]);

  const { rows: operators } = await query<{ id: string; first_name: string; last_name: string }>(
    `
      SELECT id, first_name, last_name FROM users
       WHERE organization_id = $1 AND role IN ('HOA_ADMIN', 'OPERATOR') AND status = 'ACTIVE'
       ORDER BY last_name
    `,
    [incident.organization_id],
  );

  return (
      <AdminShell
        ctx={ctx}
        activeSegment="incidents"
        pageTitle={incident.incident_number}
        pageSubtitle={incident.title}
      >
        <IncidentDetailPanel
          incident={incident}
          issues={issues}
          timeline={timeline as Array<{ id: string; event_type: string; description: string; created_at: string }>}
          affectedAreas={affectedAreas}
          operators={operators}
        />
      </AdminShell>
  );
}
