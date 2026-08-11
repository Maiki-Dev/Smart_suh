import { requireRole } from '@/lib/permissions';
import { getResidentApartmentContext } from '@/lib/resident/context';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { listAnnouncementsByOrganization } from '@/lib/queries/announcements';
import { ResidentAnnouncementsPanel } from '@/components/resident/ResidentAnnouncementsPanel';

export default async function ResidentAnnouncementsPage() {
  const ctx = await requireRole(['RESIDENT']);
  const { apartmentLabel, unreadNotifications } = await getResidentApartmentContext(ctx);

  const announcementsRes = await listAnnouncementsByOrganization(ctx.user.organization_id, {
    only_published: true,
    limit: 50,
  });

  return (
    <>
      <ThemeInitScript />
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={unreadNotifications}
        activeSegment="announcements"
        pageTitle="Зарлал"
        pageSubtitle="СӨХ-ын мэдээлэл, зарлал"
      >
        <ResidentAnnouncementsPanel announcements={announcementsRes.data} />
      </ResidentShell>
    </>
  );
}
