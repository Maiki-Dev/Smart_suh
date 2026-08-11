import { requireRole } from '@/lib/permissions';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import {
  Home as HomeIcon,
  Wallet as WalletIcon,
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
import { listInvoicesByApartment } from '@/lib/queries/invoices';
import { listAnnouncementsByOrganization } from '@/lib/queries/announcements';
import { listGateAccessLogsForApartment } from '@/lib/queries/gate_access_logs';
import { cn } from '@/lib/utils';
import {
  gateActionLabel,
  invoiceStatusLabel,
  vehicleTypeLabel,
} from '@/lib/admin/format';
import type { Invoice, Announcement, GateAccessLog } from '@/types';

function formatMNT(n: number): string {
  return n.toLocaleString('mn-MN') + '₮';
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'одоогоос';
  if (min < 60) return `${min} мын өмнө`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ц өмнө`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} өд өмнө`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m} сар өмнө`;
  return `${Math.floor(m / 12)} ж өмнө`;
}

function invoiceStatusBadge(status: Invoice['status']) {
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

  const [invoicesRes, announcementsRes, gateLogsRes] = await Promise.all([
    aptId ? listInvoicesByApartment(aptId, { limit: 6, orderBy: 'billing_year' }) : Promise.resolve({ data: [], total: 0, limit: 6, offset: 0 }),
    listAnnouncementsByOrganization(orgId, { limit: 4 }),
    aptId ? listGateAccessLogsForApartment(aptId, { limit: 6 }) : Promise.resolve({ data: [], total: 0, limit: 6, offset: 0 }),
  ] as const);

  const apartmentLabel = overview.apartment
    ? [overview.apartment.tower, overview.apartment.apartment_number].filter(Boolean).join(' · ')
    : '—';

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
        pageSubtitle={`Сайн уу, ${ctx.user.first_name}. Үндэсний төлөв, төлбөр, машины мэдээлэл.`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <ApartmentHeaderCard
            stats={overview}
            userDisplay={`${ctx.user.first_name} ${ctx.user.last_name}`}
          />
          <MonthlyFeeCard stats={overview} />
          <DebtCard stats={overview} />
          <QuickActionsCard unread={overview.unread_notifications} openMaint={overview.open_maintenance_requests} visitors={overview.active_visitor_passes} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileTextIcon className="size-4 text-violet-500" />
                  Сүүлийн нэхэмжлэл
                </CardTitle>
                <CardDescription className="text-sm">
                  Сар бүрийн төлбөрийн тайлан
                </CardDescription>
              </div>
              <a href="/resident/payments" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-4">
                Бүгдийг үзэх <ChevronRightIcon className="size-3.5" />
              </a>
            </CardHeader>
            <CardContent className="pt-0">
              <InvoiceTable data={invoices} />
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CarIcon className="size-4 text-teal-500" />
                  Машины мэдээлэл
                </CardTitle>
                <CardDescription className="text-sm">Гатааны нэвтрэлтийн эрх</CardDescription>
              </div>
              <Badge variant="secondary">{overview.vehicles.length}</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <VehicleList vehicles={overview.vehicles} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <WaypointsIcon className="size-4 text-sky-500" />
                  Гатааны лог
                </CardTitle>
                <CardDescription className="text-sm">Сүүлийн орсон гарсан</CardDescription>
              </div>
              <Badge variant="secondary">Сүүлийн 6</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <GateLogList items={gateLogs} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MegaphoneIcon className="size-4 text-emerald-500" />
                  Шинэ зарлал
                </CardTitle>
                <CardDescription className="text-sm">ХОА-ны удирдамж</CardDescription>
              </div>
              <a href="/resident/announcements" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-4">
                Бүгдийг үзэх <ChevronRightIcon className="size-3.5" />
              </a>
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

/* ────────────────────────────────────────────────────────
   Small stat cards — apartment, monthly fee, debt, quick
   ──────────────────────────────────────────────────────── */

function ApartmentHeaderCard({
  stats,
  userDisplay,
}: {
  stats: ResidentOverviewStats;
  userDisplay: string;
}) {
  const apt = stats.apartment;
  return (
    <div className="relative bg-white dark:bg-zinc-900 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 border-l-4 border-l-emerald-500 p-4 sm:p-5 overflow-hidden">
      <div className="absolute right-4 top-4 size-28 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/0 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-2 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
          Оршин сuuгч
        </span>
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
          Идэвхтэй
        </Badge>
      </div>
      <div className="relative flex flex-col gap-1 mb-3">
        <div className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {userDisplay}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Оршин суугч
        </div>
      </div>
      <Separator className="bg-zinc-200 dark:bg-zinc-800 my-3" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-1.5">
            <HomeIcon className="size-3" />
            Миний орон сuuц
          </span>
          <span className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {apt ? `${apt.tower ?? ''} · ${apt.apartment_number}`.replace(/^ · /, '') : '—'}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {apt
              ? [apt.entrance && `Гараж ${apt.entrance}`, apt.floor && `${apt.floor} давхар`, apt.area_m2 && `${apt.area_m2} м²`].filter(Boolean).join(' · ')
              : 'Өгөгдөл байхгүй'}
          </span>
        </div>
        <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 ring-1 ring-emerald-100 dark:ring-emerald-500/10">
          <HomeIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
    </div>
  );
}

function MonthlyFeeCard({ stats }: { stats: ResidentOverviewStats }) {
  const apt = stats.apartment;
  const inv = stats.current_month_invoice;
  const paidPct = inv && inv.amount > 0 ? Math.round(100 * inv.paid_amount / inv.amount) : 100;
  return (
    <div className="relative bg-white dark:bg-zinc-900 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 border-l-4 border-l-violet-500 p-4 sm:p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-1.5">
          <WalletIcon className="size-3" />
          Сарын төлбөр
        </span>
      </div>
      <div className="flex flex-col gap-1 mb-3">
        <div className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
          {apt ? formatMNT(apt.monthly_fee) : '—'}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Энэ сарын стандарт төлбөр
        </div>
      </div>
      <Separator className="bg-zinc-200 dark:bg-zinc-800 my-3" />
      {inv ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Энэ сарын төлөв</span>
            <Badge className={cn('text-[10px] uppercase tracking-wider', invoiceStatusBadge(inv.status))}>
              {invoiceStatusLabel(inv.status)}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs tabular-nums">
            <span className="text-zinc-500 dark:text-zinc-400">Төлсөн</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{formatMNT(inv.paid_amount)}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${paidPct}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] tabular-nums">
            <span className="text-zinc-500 dark:text-zinc-400">{paidPct}%</span>
            {inv.due_date ? (
              <span className="text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1">
                <CalendarIcon className="size-3" />
                {new Date(inv.due_date).toLocaleDateString('mn-MN')}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Энэхүү сарын нэхэмжлэл үүсээгүй байна.
        </p>
      )}
    </div>
  );
}

function DebtCard({ stats }: { stats: ResidentOverviewStats }) {
  const hasDebt = stats.total_debt > 0;
  return (
    <div className={cn(
      'relative rounded-xl ring-1 p-4 sm:p-5 overflow-hidden border-l-4',
      hasDebt
        ? 'bg-white dark:bg-zinc-900 ring-zinc-200 dark:ring-zinc-800 border-l-rose-500'
        : 'bg-white dark:bg-zinc-900 ring-zinc-200 dark:ring-zinc-800 border-l-emerald-500'
    )}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn(
          'text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1.5',
          hasDebt ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
        )}>
          {hasDebt ? (
            <><AlertTriangleIcon className="size-3" /> Төлбөрийн төлөв</>
          ) : (
            <><CheckIcon className="size-3" /> Төлбөрийн төлөв</>
          )}
        </span>
      </div>
      <div className="flex flex-col gap-1 mb-3">
        <div className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
          {formatMNT(stats.total_debt)}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {hasDebt ? 'Нийт үлдэгдэл төлөх шаардлагатай' : 'Бүх төлбөр хүртэл амжилттай төлөгдсөн'}
        </div>
      </div>
      <Separator className="bg-zinc-200 dark:bg-zinc-800 my-3" />
      {hasDebt ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs tabular-nums">
            <span className="text-zinc-500 dark:text-zinc-400">Энэ сарын үлдэгдэл</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {stats.current_month_invoice ? formatMNT(stats.current_month_invoice.remaining_amount) : '₮0'}
            </span>
          </div>
          <Button size="sm" className="mt-1 h-8 bg-rose-500 hover:bg-rose-600 text-white inline-flex items-center gap-1.5">
            <CreditCardIcon className="size-3.5" />
            Одоо төлөх
          </Button>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-2 py-1 self-start">
          <CheckIcon className="size-3.5" />
          Төлөв: Төлсөн
        </div>
      )}
    </div>
  );
}

function QuickActionsCard({
  unread,
  openMaint,
  visitors,
}: {
  unread: number;
  openMaint: number;
  visitors: number;
}) {
  const tiles: Array<{
    label: string;
    count: number | string;
    href: string;
    icon: LucideIcon;
    tone: string;
  }> = [
    {
      label: 'Мэдэгдэл',
      count: unread,
      href: '/resident/notifications',
      icon: BellIcon,
      tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    },
    {
      label: 'Засвар',
      count: openMaint,
      href: '/resident/maintenance',
      icon: WrenchIcon,
      tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Зочин',
      count: visitors,
      href: '/resident/visitors',
      icon: UserPlusIcon,
      tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    {
      label: 'QR уншуулах',
      count: 'QR',
      href: '/resident/visitors',
      icon: ScanLineIcon,
      tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    },
  ];
  return (
    <div className="relative bg-white dark:bg-zinc-900 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 border-l-4 border-l-sky-500 p-4 sm:p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
          Шууд үйлдлүүд
        </span>
        <span className="text-[11px] text-zinc-400">Шууд үйлдлүүд</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <a
              key={tile.label}
              href={tile.href}
              className="group relative rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-800 hover:ring-emerald-300 dark:hover:ring-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn('size-7 rounded-md flex items-center justify-center', tile.tone)}>
                  <Icon className="size-3.5" />
                </div>
                <span className="text-[10px] text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  <ArrowUpRightIcon className="size-3.5" />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                  {tile.count}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                  {tile.label}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Invoice table
   ──────────────────────────────────────────────────────── */

function InvoiceTable({ data }: { data: Invoice[] }) {
  if (!data.length) {
    return <EmptyState icon={FileTextIcon} title="Нэхэмжлэл байхгүй" description="Сар бүрийн нэхэмжлэл үүсэхэд энд харагдна." />;
  }
  return (
    <div className="overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800">
      <div className="grid grid-cols-12 gap-2 px-3 sm:px-4 py-2.5 text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold bg-zinc-50/60 dark:bg-zinc-800/30">
        <div className="col-span-3 sm:col-span-2">Сар</div>
        <div className="col-span-4 sm:col-span-3">Дүн</div>
        <div className="hidden sm:block sm:col-span-2">Төлсөн</div>
        <div className="col-span-3 sm:col-span-2">Үлдэгдэл</div>
        <div className="col-span-2 sm:col-span-3 text-right">Төлөв</div>
      </div>
      <div className="flex flex-col">
        {data.map((inv) => (
          <div key={inv.id} className="grid grid-cols-12 gap-2 items-center px-3 sm:px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
            <div className="col-span-3 sm:col-span-2 flex flex-col">
              <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                {inv.billing_year}·{String(inv.billing_month).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                #{inv.invoice_number}
              </span>
            </div>
            <div className="col-span-4 sm:col-span-3 text-xs sm:text-sm tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
              {formatMNT(inv.amount)}
            </div>
            <div className="hidden sm:flex sm:col-span-2 text-xs tabular-nums text-emerald-700 dark:text-emerald-300 font-medium">
              {formatMNT(inv.paid_amount)}
            </div>
            <div className={cn(
              'col-span-3 sm:col-span-2 text-xs sm:text-sm tabular-nums font-semibold',
              inv.remaining_amount > 0 ? 'text-rose-600 dark:text-rose-300' : 'text-zinc-500 dark:text-zinc-400'
            )}>
              {formatMNT(inv.remaining_amount)}
            </div>
            <div className="col-span-2 sm:col-span-3 flex justify-end">
              <Badge className={cn('text-[10px] uppercase tracking-wider', invoiceStatusBadge(inv.status))}>
                {invoiceStatusLabel(inv.status)}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Vehicle list
   ──────────────────────────────────────────────────────── */

function VehicleList({ vehicles }: { vehicles: VehicleRow[] }) {
  if (!vehicles.length) {
    return <EmptyState icon={CarIcon} title="Машин бүртгэлгүй" description="Машинаа бүртгэж, RFID эрх аваарай." />;
  }
  return (
    <div className="flex flex-col">
      {vehicles.map((v, idx) => (
        <div key={v.id} className={cn(
          'flex items-start justify-between gap-3 py-3',
          idx !== vehicles.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''
        )}>
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              'mt-0.5 size-9 rounded-lg flex items-center justify-center shrink-0 ring-1',
              v.active
                ? 'bg-teal-50 dark:bg-teal-500/10 ring-teal-100 dark:ring-teal-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 ring-zinc-200 dark:ring-zinc-800'
            )}>
              <CarIcon className={cn('size-4', v.active ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-500')} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
                  {v.plate_number}
                </span>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  {vehicleTypeLabel(v.vehicle_type)}
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <WaypointsIcon className="size-3" />
                  {v.gate_access ? 'RFID идэвхтэй' : 'RFID идэвхгүй'}
                </span>
                {v.rfid_number ? (
                  <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                    · {v.rfid_number}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            {v.active ? (
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                <CheckIcon className="size-3" />
                Active
              </Badge>
            ) : (
              <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                <XIcon className="size-3" />
                Disabled
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Gate access logs
   ──────────────────────────────────────────────────────── */

function GateLogList({ items }: { items: GateAccessLog[] }) {
  if (!items.length) {
    return <EmptyState icon={WaypointsIcon} title="Гатааны лог байхгүй" description="Машины гатааны нэвтрэлт энд харагдна." />;
  }
  return (
    <div className="flex flex-col">
      {items.map((l, idx) => {
        const isEntry = l.action === 'ENTER';
        return (
          <div key={l.id} className={cn(
            'flex items-center gap-3 py-2.5',
            idx !== items.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''
          )}>
            <div className={cn(
              'size-8 rounded-md flex items-center justify-center shrink-0',
              isEntry
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
            )}>
              {isEntry ? <ArrowUpRightIcon className="size-4 rotate-45" /> : <ArrowUpRightIcon className="size-4 -rotate-[135deg]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {gateActionLabel(l.action)}
                </span>
                <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">
                  {gateActionLabel(l.action)}
                </Badge>
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                {l.triggered_by ?? 'RFID'}
                {l.reason ? ` · ${l.reason}` : ''}
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
              {relativeTime(l.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Announcement feed
   ──────────────────────────────────────────────────────── */

function AnnouncementFeed({ data }: { data: Announcement[] }) {
  if (!data.length) {
    return <EmptyState icon={MegaphoneIcon} title="Зарлал байхгүй" description="Шинэ зарлал нийтлэгдэхэд энд харагдна." />;
  }
  return (
    <div className="flex flex-col gap-2">
      {data.map((row, idx) => {
        const pinned = !!row.is_pinned;
        return (
          <div
            key={row.id}
            className={cn(
              'rounded-xl ring-1 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40',
              pinned
                ? 'bg-amber-50/40 dark:bg-amber-500/5 ring-amber-200 dark:ring-amber-500/10'
                : 'bg-white dark:bg-zinc-900 ring-zinc-200 dark:ring-zinc-800',
              idx !== data.length - 1 ? '' : ''
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2">
                {pinned ? (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                    <MegaphoneIcon className="size-3" />
                    ОНЦЛОСОН
                  </Badge>
                ) : null}
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                  {row.title}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                {relativeTime(row.created_at)}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap line-clamp-3">
              {row.content}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                {row.published_at ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon className="size-3" />
                    {new Date(row.published_at).toLocaleDateString('mn-MN')}
                  </span>
                ) : null}
                {row.expires_at ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangleIcon className="size-3" />
                    дуусах: {new Date(row.expires_at).toLocaleDateString('mn-MN')}
                  </span>
                ) : null}
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
                Дэлгэрэнгүй <ChevronRightIcon className="size-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="py-10 flex flex-col items-center text-center gap-2">
      <div className="size-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center ring-1 ring-zinc-200 dark:ring-zinc-800 mb-1">
        <Icon className="size-4 text-zinc-500" />
      </div>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {description ? <p className="text-xs text-zinc-500 max-w-sm">{description}</p> : null}
    </div>
  );
}
