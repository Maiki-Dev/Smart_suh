import { requireRole } from '@/lib/permissions';
import { getResidentApartmentContext } from '@/lib/resident/context';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { listMaintenanceRequestsByApartment, listMaintenanceComments } from '@/lib/queries/maintenance';
import { ResidentMaintenancePanel } from '@/components/resident/ResidentMaintenancePanel';

export default async function ResidentMaintenancePage() {
  const ctx = await requireRole(['RESIDENT']);
  const { apartmentId, apartmentLabel, unreadNotifications } = await getResidentApartmentContext(ctx);

  const requestsRes = apartmentId
    ? await listMaintenanceRequestsByApartment(apartmentId, { limit: 50 })
    : { data: [], total: 0 };

  const commentsByRequest = apartmentId
    ? await Promise.all(
        requestsRes.data.map(async (req) => ({
          requestId: req.id,
          comments: await listMaintenanceComments(req.id),
        })),
      )
    : [];

  const commentsMap = Object.fromEntries(
    commentsByRequest.map(({ requestId, comments }) => [requestId, comments]),
  );

  return (
    <>
      <ThemeInitScript />
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={unreadNotifications}
        activeSegment="maintenance"
        pageTitle="Засвар"
        pageSubtitle="Засварын хүсэлт бүртгэх, явц хянах"
      >
        <ResidentMaintenancePanel
          requests={requestsRes.data}
          commentsByRequest={commentsMap}
          hasApartment={!!apartmentId}
        />
      </ResidentShell>
    </>
  );
}
