import { requireRole } from '@/lib/permissions';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { getResidentOverviewStats } from '@/lib/queries/dashboard';
import { getVehicleAccessSummary } from '@/lib/gate/vehicle-access-service';
import { listGateAccessLogsForApartment } from '@/lib/queries/gate_access_logs';
import { ResidentVehiclePanel } from '@/components/resident/ResidentVehiclePanel';
import { GATE_DISABLED_REASON } from '@/lib/gate/consecutive-unpaid';

export default async function ResidentVehiclePage() {
  const ctx = await requireRole(['RESIDENT']);
  const overview = await getResidentOverviewStats(ctx.user.organization_id, ctx.user.id);
  const aptId = overview.apartment?.id;

  const [accessSummary, logsRes] = aptId
    ? await Promise.all([
        getVehicleAccessSummary(aptId),
        listGateAccessLogsForApartment(aptId, { limit: 20 }),
      ])
    : [{ vehicle: null, consecutiveUnpaidMonths: 0, gateAccess: false, disabledReason: null }, { data: [], total: 0 }];

  const apartmentLabel = overview.apartment
    ? [overview.apartment.tower, overview.apartment.apartment_number].filter(Boolean).join(' · ')
    : '—';

  return (
    <>
      <ThemeInitScript />
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={overview.unread_notifications}
        activeSegment="vehicle"
        pageTitle="Машин"
        pageSubtitle="Улсын дугаар, RFID, зогсоолын эрхийн төлөв"
      >
        <ResidentVehiclePanel
          vehicle={accessSummary.vehicle}
          gateAccess={accessSummary.gateAccess}
          consecutiveUnpaidMonths={accessSummary.consecutiveUnpaidMonths}
          disabledReason={accessSummary.disabledReason ?? (accessSummary.consecutiveUnpaidMonths >= 2 ? GATE_DISABLED_REASON : null)}
          logs={logsRes.data}
        />
      </ResidentShell>
    </>
  );
}
