import Link from 'next/link';
import { requireRole } from '@/lib/permissions';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { ResidentSetupBanner } from '@/components/resident/ResidentSetupBanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import type { LucideIcon } from 'lucide-react';
import {
  Home as HomeIcon,
  AlertTriangle as AlertTriangleIcon,
  Car as CarIcon,
  Waypoints as WaypointsIcon,
  Bell as BellIcon,
  Wrench as WrenchIcon,
  Megaphone as MegaphoneIcon,
  CreditCard as CreditCardIcon,
  Calendar as CalendarIcon,
  UserPlus as UserPlusIcon,
  FileText as FileTextIcon,
  Check as CheckIcon,
  X as XIcon,
  ChevronRight as ChevronRightIcon,
  ScanLine as ScanLineIcon,
  ArrowUpRight as ArrowUpRightIcon,
} from 'lucide-react';
import {
  getResidentOverviewStats,
  type ResidentOverviewStats,
} from '@/lib/queries/dashboard';
import { getResidentByEmail } from '@/lib/queries/residents';
import { listInvoicesByApartment } from '@/lib/queries/invoices';
import { listAnnouncementsByOrganization } from '@/lib/queries/announcements';
import { listGateAccessLogsForApartment } from '@/lib/queries/gate_access_logs';
import { formatBillingMonthMn, formatDateMn, formatDateTimeMn, formatDateOnlyDateTimeMn } from '@/lib/format/datetime';
import { cn } from '@/lib/utils';
import {
  formatMNT,
  gateActionLabel,
  invoiceStatusLabel,
  vehicleTypeLabel,
} from '@/lib/admin/format';
import {
  aggregateInvoiceTotals,
  feeBreakdownFromApartment,
  feeBreakdownFromInvoices,
  invoiceFeeTypeLabel,
  type FeeBreakdown,
} from '@/lib/fees/apartment-fees';
import { FeeBreakdownPanel } from '@/components/resident/FeeBreakdownPanel';
import type { Invoice, Announcement, GateAccessLog } from '@/types';

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

function relativeTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'саяхан';
  if (min < 60) return `${min} мин өмнө`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} цаг өмнө`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} өдөр өмнө`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m} сар өмнө`;
  return `${Math.floor(m / 12)} жил өмнө`;
}

function invoiceStatusTone(status: Invoice['status']) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
    case 'PARTIAL':
      return 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300';
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
    case 'OVERDUE':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
    case 'CANCELLED':
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  }
}

interface VehicleRow {
  id: string;
  plate_number: string;
  vehicle_type: string;
  active: boolean;
  gate_access: boolean;
  rfid_number: string | null;
}

export default async function ResidentDashboardPage() {
  const ctx = await requireRole(['RESIDENT']);
  const orgId = ctx.user.organization_id;
  const userId = ctx.user.id;

  const overview = await getResidentOverviewStats(orgId, userId);
  const aptId = overview.apartment?.id;

  const [invoicesRes, announcementsRes, gateLogsRes, residentByEmail] = await Promise.all([
    aptId
      ? listInvoicesByApartment(aptId, { limit: 6, orderBy: 'billing_year' })
      : Promise.resolve({ data: [], total: 0, limit: 6, offset: 0 }),
    listAnnouncementsByOrganization(orgId, { limit: 4 }),
    aptId
      ? listGateAccessLogsForApartment(aptId, { limit: 6 })
      : Promise.resolve({ data: [], total: 0, limit: 6, offset: 0 }),
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

  const invoices = invoicesRes.data;
  const announcements = announcementsRes.data;
  const gateLogs = gateLogsRes.data;

  return (
    <>
      <ThemeInitScript />
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={overview.unread_notifications}
        activeSegment=""
        pageTitle="Нүүр хуудас"
        pageSubtitle={`Сайн байна уу, ${ctx.user.first_name}. Төлбөр, машин, зарлалын тойм.`}
      >
        {setupReason ? (
          <ResidentSetupBanner reason={setupReason} />
        ) : null}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ApartmentCard stats={overview} userName={`${ctx.user.first_name} ${ctx.user.last_name}`} />
          <DebtCard stats={overview} />
          <QuickLinksCard
            unread={overview.unread_notifications}
            openMaint={overview.open_maintenance_requests}
            visitors={overview.active_visitor_passes}
          />
        </div>

        {resolveCurrentFees(overview) ? (
          <div className="mb-6">
            <FeeBreakdownPanel
              fees={resolveCurrentFees(overview)!}
              invoiceStatus={resolveCurrentSummary(overview)?.status}
              paidAmount={resolveCurrentSummary(overview)?.paid_amount}
              remainingAmount={resolveCurrentSummary(overview)?.remaining_amount}
            />
          </div>
        ) : null}

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base">Сүүлийн нэхэмжлэл</CardTitle>
                <CardDescription>Сар бүрийн төлбөрийн түүх</CardDescription>
              </div>
              <Link
                href="/resident/payments"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Бүгдийг үзэх
                <ChevronRightIcon className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              <InvoiceTable data={invoices} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <CardTitle className="text-base">Машины мэдээлэл</CardTitle>
                <CardDescription>Зогсоолын нэвтрэлт</CardDescription>
              </div>
              <Badge variant="secondary">{overview.vehicles.length}</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <VehicleList vehicles={overview.vehicles} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Зогсоолын лог</CardTitle>
              <CardDescription>Сүүлийн орсон, гарсан бүртгэл</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <GateLogList items={gateLogs} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base">Зарлал</CardTitle>
                <CardDescription>ХОА-ын мэдэгдэл</CardDescription>
              </div>
              <Link
                href="/resident/announcements"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Бүгдийг үзэх
                <ChevronRightIcon className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              <AnnouncementFeed data={announcements} />
            </CardContent>
          </Card>
        </div>
      </ResidentShell>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
            {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApartmentCard({
  stats,
  userName,
}: {
  stats: ResidentOverviewStats;
  userName: string;
}) {
  const apt = stats.apartment;
  const aptLabel = apt
    ? [apt.tower, apt.apartment_number].filter(Boolean).join(' · ')
    : '—';
  const details = apt
    ? [apt.entrance && `Гараж ${apt.entrance}`, apt.floor && `${apt.floor} давхар`, apt.area_m2 && `${apt.area_m2} м²`]
        .filter(Boolean)
        .join(' · ')
    : 'Админаас холбох шаардлагатай';

  return (
    <StatCard
      label={`${userName} · Миний орон сууц`}
      value={aptLabel}
      sub={details}
      icon={HomeIcon}
    />
  );
}

function DebtCard({ stats }: { stats: ResidentOverviewStats }) {
  const hasDebt = stats.total_debt > 0;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">Нийт үлдэгдэл</p>
            <p className={cn('text-2xl font-semibold tabular-nums tracking-tight', hasDebt && 'text-rose-600 dark:text-rose-400')}>
              {formatMNT(stats.total_debt)}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasDebt ? 'Төлбөр төлөх шаардлагатай' : 'Бүх төлбөр төлөгдсөн'}
            </p>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            {hasDebt ? (
              <AlertTriangleIcon className="size-4 text-rose-500" />
            ) : (
              <CheckIcon className="size-4 text-emerald-600" />
            )}
          </div>
        </div>
        {hasDebt ? (
          <Link
            href="/resident/payments"
            className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <CreditCardIcon className="size-3.5" />
            Төлбөр төлөх
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuickLinksCard({
  unread,
  openMaint,
  visitors,
}: {
  unread: number;
  openMaint: number;
  visitors: number;
}) {
  const links = [
    { label: 'Мэдэгдэл', count: unread, href: '/resident/notifications', icon: BellIcon },
    { label: 'Засвар', count: openMaint, href: '/resident/maintenance', icon: WrenchIcon },
    { label: 'Зочин', count: visitors, href: '/resident/visitors', icon: UserPlusIcon },
    { label: 'QR код', count: '→', href: '/resident/visitors', icon: ScanLineIcon },
  ] as const;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
        <CardTitle className="text-sm font-medium">Түргэн холбоос</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 px-4 pb-4 sm:px-5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              className="group flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/60"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tabular-nums">{link.count}</p>
                <p className="truncate text-[11px] text-muted-foreground">{link.label}</p>
              </div>
              <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

function InvoiceTable({ data }: { data: Invoice[] }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={FileTextIcon}
        title="Нэхэмжлэл байхгүй"
        description="Орон сууц холбогдсоны дараа сар бүрийн нэхэмжлэл энд харагдана."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-12 gap-2 bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground sm:px-4">
        <div className="col-span-3 sm:col-span-2">Огноо</div>
        <div className="col-span-3 sm:col-span-2">Төрөл</div>
        <div className="col-span-3 sm:col-span-2">Дүн</div>
        <div className="hidden sm:col-span-2 sm:block">Төлсөн</div>
        <div className="col-span-2 sm:col-span-2">Үлдэгдэл</div>
        <div className="col-span-1 text-right sm:col-span-2">Төлөв</div>
      </div>
      <div className="divide-y divide-border">
        {data.map((inv) => (
          <div
            key={inv.id}
            className="grid grid-cols-12 items-center gap-2 px-3 py-3 text-sm sm:px-4"
          >
            <div className="col-span-3 sm:col-span-2">
              <p className="font-medium tabular-nums">
                {formatBillingMonthMn(inv.billing_year, inv.billing_month)}
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {formatDateTimeMn(inv.created_at)}
              </p>
              {inv.due_date ? (
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  Төлөх: {formatDateOnlyDateTimeMn(inv.due_date)}
                </p>
              ) : null}
              <p className="truncate text-[11px] text-muted-foreground">#{inv.invoice_number}</p>
            </div>
            <div className="col-span-3 text-sm sm:col-span-2">{invoiceFeeTypeLabel(inv.fee_type)}</div>
            <div className="col-span-3 font-medium tabular-nums sm:col-span-2">
              {formatMNT(inv.amount)}
            </div>
            <div className="hidden tabular-nums text-emerald-700 dark:text-emerald-300 sm:col-span-2 sm:block">
              {formatMNT(inv.paid_amount)}
            </div>
            <div
              className={cn(
                'col-span-2 font-medium tabular-nums sm:col-span-2',
                inv.remaining_amount > 0 ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground',
              )}
            >
              {formatMNT(inv.remaining_amount)}
            </div>
            <div className="col-span-1 flex justify-end sm:col-span-2">
              <Badge className={cn('text-[11px]', invoiceStatusTone(inv.status))}>
                {invoiceStatusLabel(inv.status)}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VehicleList({ vehicles }: { vehicles: VehicleRow[] }) {
  if (!vehicles.length) {
    return (
      <EmptyState
        icon={CarIcon}
        title="Машин бүртгэлгүй"
        description="Машинаа бүртгүүлсний дараа RFID эрх энд харагдана."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {vehicles.map((v) => (
        <div key={v.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium tabular-nums">{v.plate_number}</span>
              <Badge variant="secondary" className="text-[11px]">
                {vehicleTypeLabel(v.vehicle_type)}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {v.gate_access ? 'RFID идэвхтэй' : 'RFID идэвхгүй'}
              {v.rfid_number ? ` · ${v.rfid_number}` : ''}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'shrink-0 text-[11px]',
              v.active
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                : '',
            )}
          >
            {v.active ? (
              <>
                <CheckIcon className="size-3" /> Идэвхтэй
              </>
            ) : (
              <>
                <XIcon className="size-3" /> Идэвхгүй
              </>
            )}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function GateLogList({ items }: { items: GateAccessLog[] }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={WaypointsIcon}
        title="Лог байхгүй"
        description="Зогсоолын нэвтрэлт энд харагдана."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((log) => {
        const isEntry = log.action === 'ENTER';
        return (
          <div key={log.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-medium',
                isEntry
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
              )}
            >
              {isEntry ? 'Ор' : 'Гар'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{gateActionLabel(log.action)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {log.triggered_by ?? 'RFID'}
                {log.reason ? ` · ${log.reason}` : ''}
              </p>
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {relativeTime(log.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AnnouncementFeed({ data }: { data: Announcement[] }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={MegaphoneIcon}
        title="Зарлал байхгүй"
        description="Шинэ зарлал нийтлэгдэхэд энд харагдана."
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.map((row) => (
        <div
          key={row.id}
          className={cn(
            'rounded-lg border border-border p-4',
            row.is_pinned && 'border-amber-200 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5',
          )}
        >
          <div className="mb-1.5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {row.is_pinned ? (
                <Badge variant="secondary" className="text-[11px]">
                  Онцлох
                </Badge>
              ) : null}
              <h3 className="text-sm font-medium">{row.title}</h3>
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {relativeTime(row.created_at)}
            </span>
          </div>
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {row.content}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {row.published_at ? (
              <span className="inline-flex items-center gap-1">
                <CalendarIcon className="size-3" />
                {formatDateMn(row.published_at)}
              </span>
            ) : null}
            {row.expires_at ? (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <AlertTriangleIcon className="size-3" />
                Дуусах: {formatDateMn(row.expires_at)}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
