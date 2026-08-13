import { requireRole } from '@/lib/permissions';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ResidentSetupBanner } from '@/components/resident/ResidentSetupBanner';
import { ResidentHomeOverview } from '@/components/resident/dashboard/ResidentHomeOverview';
import { getResidentOverviewStats, type ResidentOverviewStats } from '@/lib/queries/dashboard';
import { getResidentByEmail } from '@/lib/queries/residents';
import { listAnnouncementsByOrganization } from '@/lib/queries/announcements';
import {
  aggregateInvoiceTotals,
  feeBreakdownFromApartment,
  feeBreakdownFromInvoices,
  type FeeBreakdown,
} from '@/lib/fees/apartment-fees';

function resolveCurrentFees(overview: ResidentOverviewStats): FeeBreakdown | null {
  if (overview.current_month_invoices.length > 0) {
    return feeBreakdownFromInvoices(overview.current_month_invoices);
  }
  if (overview.apartment) {
    return feeBreakdownFromApartment(overview.apartment);
  }
  return null;
}

function resolveCurrentSummary(overview: ResidentOverviewStats) {
  if (overview.current_month_invoices.length > 0) {
    return aggregateInvoiceTotals(overview.current_month_invoices);
  }
  return null;
}

export default async function ResidentDashboardPage() {
  const ctx = await requireRole(['RESIDENT']);
  const orgId = ctx.user.organization_id;
  const userId = ctx.user.id;

  const overview = await getResidentOverviewStats(orgId, userId);

  const [announcementsRes, residentByEmail] = await Promise.all([
    listAnnouncementsByOrganization(orgId, { limit: 4 }),
    ctx.user.email ? getResidentByEmail(orgId, ctx.user.email) : Promise.resolve(null),
  ] as const);

  const apartmentLabel = overview.apartment
    ? [overview.apartment.tower, overview.apartment.apartment_number].filter(Boolean).join(' · ')
    : '—';

  const setupReason = !overview.apartment
    ? residentByEmail && !residentByEmail.user_id
      ? ('unlinked_account' as const)
      : ('no_record' as const)
    : null;

  const fees = resolveCurrentFees(overview);
  const summary = resolveCurrentSummary(overview);
  const userName = `${ctx.user.first_name} ${ctx.user.last_name}`.trim();

  return (
    <ResidentShell
      ctx={ctx}
      apartmentLabel={apartmentLabel}
      unreadNotifications={overview.unread_notifications}
      activeSegment=""
      pageTitle="Нүүр хуудас"
      pageSubtitle={`Сайн байна уу, ${ctx.user.first_name}. Төлбөр, зарлал, засвараа эндээс хялбархан харна.`}
    >
      {setupReason ? <ResidentSetupBanner reason={setupReason} /> : null}

      <ResidentHomeOverview
        overview={overview}
        userName={userName}
        fees={fees}
        summary={summary}
        announcements={announcementsRes.data}
        vehicles={overview.vehicles}
      />
    </ResidentShell>
  );
}
