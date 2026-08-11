import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { AnnouncementManagement } from '@/components/admin/AnnouncementManagement';
import { listAnnouncementsByOrganization } from '@/lib/queries/announcements';

export default async function AdminAnnouncementsPage() {
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);
  const orgId = orgScope ?? ctx.user.organization_id;

  const announcementsRes = await listAnnouncementsByOrganization(orgId, {
    only_published: false,
    include_expired: true,
    limit: 200,
  });

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="announcements"
        pageTitle="Зарлал"
        pageSubtitle="Оршин суугчдад зориулсан зарлал, мэдээлэл"
      >
        <AnnouncementManagement
          announcements={announcementsRes.data}
          total={announcementsRes.total}
        />
      </AdminShell>
    </>
  );
}
