import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { AnnouncementManagement } from '@/components/admin/AnnouncementManagement';
import { listAnnouncementsByOrganization } from '@/lib/queries/announcements';
import { parseTablePagination } from '@/lib/admin/pagination';

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const { page, limit, offset } = parseTablePagination(params);
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);
  const orgId = orgScope ?? ctx.user.organization_id;

  const announcementsRes = await listAnnouncementsByOrganization(orgId, {
    only_published: false,
    include_expired: true,
    limit,
    offset,
  });

  return (
      <AdminShell
        ctx={ctx}
        activeSegment="announcements"
        pageTitle="Зарлал"
        pageSubtitle="Оршин суугчдад зориулсан зарлал, мэдээлэл"
      >
        <AnnouncementManagement
          announcements={announcementsRes.data}
          total={announcementsRes.total}
          page={page}
          limit={limit}
        />
      </AdminShell>
  );
}
