import { requireRole } from '@/lib/permissions';
import { getResidentApartmentContext } from '@/lib/resident/context';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { listVisitorPassesByApartment } from '@/lib/queries/visitors';
import { ResidentVisitorsPanel } from '@/components/resident/ResidentVisitorsPanel';

export default async function ResidentVisitorsPage() {
  const ctx = await requireRole(['RESIDENT']);
  const { apartmentId, apartmentLabel, unreadNotifications } = await getResidentApartmentContext(ctx);

  const passesRes = apartmentId
    ? await listVisitorPassesByApartment(apartmentId, { limit: 100 })
    : { data: [], total: 0 };

  return (
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={unreadNotifications}
        activeSegment="visitors"
        pageTitle="Зочин"
        pageSubtitle="Зочны эрх үүсгэх, QR код, түүх"
      >
        <ResidentVisitorsPanel passes={passesRes.data} hasApartment={!!apartmentId} />
      </ResidentShell>
  );
}
