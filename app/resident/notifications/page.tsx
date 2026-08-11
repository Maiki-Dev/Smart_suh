import { requireRole } from '@/lib/permissions';
import { getResidentApartmentContext } from '@/lib/resident/context';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { listNotificationsByUser } from '@/lib/queries/notifications';
import { ResidentNotificationsPanel } from '@/components/resident/ResidentNotificationsPanel';

export default async function ResidentNotificationsPage() {
  const ctx = await requireRole(['RESIDENT']);
  const { apartmentLabel, unreadNotifications } = await getResidentApartmentContext(ctx);

  const notificationsRes = await listNotificationsByUser(ctx.user.id, { limit: 100 });

  return (
    <>
      <ThemeInitScript />
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={unreadNotifications}
        activeSegment="notifications"
        pageTitle="Мэдэгдэл"
        pageSubtitle="Системийн мэдэгдэл, сануулга"
      >
        <ResidentNotificationsPanel notifications={notificationsRes.data} />
      </ResidentShell>
    </>
  );
}
