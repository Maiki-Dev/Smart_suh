import { requireRole } from '@/lib/permissions';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ResidentCommunityList } from '@/components/resident/ResidentCommunityPanel';
import { getResidentOverviewStats } from '@/lib/queries/dashboard';
import { getResidentByUserId } from '@/lib/queries/residents';
import { listProposalsForResident } from '@/lib/queries/community';

export default async function ResidentCommunityPage() {
  const ctx = await requireRole(['RESIDENT']);
  const [overview, resident] = await Promise.all([
    getResidentOverviewStats(ctx.user.organization_id, ctx.user.id),
    getResidentByUserId(ctx.user.id),
  ]);

  const apartmentLabel = overview.apartment
    ? [overview.apartment.tower, overview.apartment.apartment_number].filter(Boolean).join(' · ')
    : '—';

  const proposals = resident
    ? await listProposalsForResident(ctx.user.organization_id, resident.id)
    : [];

  return (
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={overview.unread_notifications}
        activeSegment="community"
        pageTitle="Хамтын шийдвэр"
        pageSubtitle="Санал хураалт, төсөл"
      >
        <ResidentCommunityList proposals={proposals} />
      </ResidentShell>
  );
}
