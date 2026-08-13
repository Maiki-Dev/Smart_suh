import { requireRole } from '@/lib/permissions';
import { getResidentApartmentContext } from '@/lib/resident/context';
import { ResidentShell } from '@/components/layout/ResidentShell';
import {
  listMaintenanceRequestsByApartment,
  listMaintenanceCommentsForRequests,
} from '@/lib/queries/maintenance';
import { ResidentMaintenancePanel } from '@/components/resident/ResidentMaintenancePanel';

export default async function ResidentMaintenancePage() {
  const ctx = await requireRole(['RESIDENT']);
  const { apartmentId, apartmentLabel, unreadNotifications } = await getResidentApartmentContext(ctx);

  const requestsRes = apartmentId
    ? await listMaintenanceRequestsByApartment(apartmentId, { limit: 50 })
    : { data: [], total: 0, limit: 50, offset: 0 };

  const commentsByRequest = apartmentId
    ? await listMaintenanceCommentsForRequests(requestsRes.data.map((req) => req.id))
    : {};

  return (
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
          commentsByRequest={commentsByRequest}
          hasApartment={!!apartmentId}
        />
      </ResidentShell>
  );
}
