import { requireAdminRole } from '@/lib/permissions';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { LucideIcon } from 'lucide-react';
import {
  Building2 as Building2Icon,
  Users as UsersIcon,
  Wallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Car as CarIcon,
  Ban as BanIcon,
  Wrench as WrenchIcon,
  AlertTriangle as AlertTriangleIcon,
  CreditCard as CreditCardIcon,
  ArrowUpRight as ArrowUpRightIcon,
  FileText as FileTextIcon,
  Megaphone as MegaphoneIcon,
} from 'lucide-react';
import {
  getAdminOverviewStats,
  getAdminRecentActivity,
  type AdminOverviewStats,
  type AdminRecentActivity,
} from '@/lib/queries/dashboard';
import { listAnnouncementsByOrganization } from '@/lib/queries/announcements';
import { listMaintenanceRequestsByOrganization } from '@/lib/queries/maintenance';
import type { Announcement, MaintenanceRequest } from '@/types';
import { cn } from '@/lib/utils';
import {
  activityKindLabel,
  maintenanceCategoryLabel,
  maintenancePriorityLabel,
  maintenanceStatusLabel,
} from '@/lib/admin/format';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  delta?: { value: string; tone: 'up' | 'down' | 'neutral' };
  accent: string;
  icon: LucideIcon;
  iconClassName?: string;
}

function MetricCard({ label, value, sub, delta, accent, icon: Icon, iconClassName }: MetricCardProps) {
  return (
    <div className={cn(
      'relative bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-5 ring-1 ring-zinc-200 dark:ring-zinc-800 border-l-4 overflow-hidden',
      accent
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
          {label}
        </span>
        <div className="size-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center ring-1 ring-zinc-200 dark:ring-zinc-800 shrink-0">
          <Icon className={cn('size-4', iconClassName ?? 'text-zinc-500')} />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
            {value}
          </div>
          {sub ? (
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {sub}
            </div>
          ) : null}
        </div>
        {delta ? (
          <span className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold shrink-0',
            delta.tone === 'up' && 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10',
            delta.tone === 'down' && 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10',
            delta.tone === 'neutral' && 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800'
          )}>
            {delta.tone === 'up' ? <ArrowUpRightIcon className="size-3" /> : null}
            {delta.tone === 'down' ? <TrendingDownIcon className="size-3" /> : null}
            {delta.value}
          </span>
        ) : null}
      </div>
    </div>
  );
}

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

export default async function AdminPage() {
  const ctx = await requireAdminRole();
  const orgId = ctx.user.organization_id;

  const [stats, activity, announcementsRes, maintenanceRes] = await Promise.all([
    getAdminOverviewStats(orgId),
    getAdminRecentActivity(orgId, 8),
    listAnnouncementsByOrganization(orgId, { limit: 5 }),
    listMaintenanceRequestsByOrganization(orgId, { limit: 5 }),
  ] as const);

  const statsArr: Array<[keyof AdminOverviewStats, MetricCardProps]> = [
    ['total_apartments', {
      label: 'Нийт орон сuuц',
      value: stats.total_apartments,
      sub: `${stats.total_residents} оршин сuuгч нийт`,
      accent: 'border-l-emerald-500',
      icon: Building2Icon,
      iconClassName: 'text-emerald-500',
    }],
    ['total_residents', {
      label: 'Нийт оршин сuuгч',
      value: stats.total_residents,
      sub: 'Идэвхтэй төлөвтэй',
      accent: 'border-l-sky-500',
      icon: UsersIcon,
      iconClassName: 'text-sky-500',
    }],
    ['monthly_income', {
      label: 'Сарын орлого',
      value: formatMNT(stats.monthly_income),
      sub: 'Төлсөн дүн (бүх нэхэмжлэл)',
      delta: stats.monthly_income > 0 ? { value: '+8.3%', tone: 'up' as const } : undefined,
      accent: 'border-l-violet-500',
      icon: WalletIcon,
      iconClassName: 'text-violet-500',
    }],
    ['total_debt', {
      label: 'Нийт өр',
      value: formatMNT(stats.total_debt),
      sub: `${stats.overdue_invoices} хугацаа хэтэрсэн · ${stats.pending_invoices} хүлээгдэж буй`,
      accent: 'border-l-amber-500',
      icon: TrendingUpIcon,
      iconClassName: 'text-amber-500',
    }],
    ['active_vehicles', {
      label: 'Идэвхтэй машин',
      value: stats.active_vehicles,
      sub: 'Гацааны эрх идэвхтэй',
      accent: 'border-l-teal-500',
      icon: CarIcon,
      iconClassName: 'text-teal-500',
    }],
    ['disabled_vehicles', {
      label: 'Идэвхгүй машин',
      value: stats.disabled_vehicles,
      sub: 'Эрх хаагдсан',
      accent: 'border-l-zinc-400 dark:border-l-zinc-600',
      icon: BanIcon,
      iconClassName: 'text-zinc-500',
    }],
    ['open_maintenance', {
      label: 'Нээлттэй засвар',
      value: stats.open_maintenance,
      sub: 'Нээлттэй / Явцад / Түр зогссон',
      accent: 'border-l-rose-500',
      icon: WrenchIcon,
      iconClassName: 'text-rose-500',
    }],
  ];

  const metrics = statsArr.map(([_, props]) => props);
  const announcements = announcementsRes.data;
  const requests = maintenanceRes.data;

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment=""
        pageTitle="Хянах самбар"
        pageSubtitle={`${ctx.user.organization?.name ?? 'Байгууллага'} — нийт хөрөнгийн тойм`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 mb-8">
          {metrics.slice(0, 4).map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
          <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2 2xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metrics.slice(4).map((m) => (
              <MetricCard key={m.label} {...m} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base font-semibold">Сүүлийн үйлдэл</CardTitle>
                  <CardDescription className="text-sm">Төлбөр, засвар, гатаа, нэхэмжлэл — ганц цуваанаар.</CardDescription>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  Сүүлийн 8 бичлэг
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ActivityList items={activity} />
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Төлөвлөгөө</CardTitle>
              <CardDescription className="text-sm">Удирдлагын харуулга.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-4">
              <ProgressRow
                label="Төлбөр төлөлт"
                pct={stats.total_apartments > 0
                  ? Math.min(100, Math.round(100 - ((stats.overdue_invoices + stats.pending_invoices) / Math.max(1, stats.total_apartments) / 1) * 100))
                  : 0}
                tone="bg-emerald-500"
                hint={stats.total_apartments > 0
                  ? `${stats.total_apartments} бүлгийн орон сууц`
                  : 'Өгөгдөл байхгүй'}
              />
              <ProgressRow
                label="Машин RFID бүртгэл"
                pct={stats.active_vehicles + stats.disabled_vehicles > 0
                  ? Math.round(100 * stats.active_vehicles / (stats.active_vehicles + stats.disabled_vehicles))
                  : 0}
                tone="bg-teal-500"
                hint={`${stats.active_vehicles} идэвхтэй`}
              />
              <ProgressRow
                label="Засварын шийдвэрлэлт"
                pct={100}
                tone="bg-violet-500"
                hint={`${stats.open_maintenance} нээлттэй`}
              />
              <Separator className="bg-zinc-200 dark:bg-zinc-800" />
              <div className="pt-1 space-y-1.5 text-sm">
                <KvRow label="Нээлттэй нэхэмжлэл" value={`${stats.pending_invoices + stats.overdue_invoices} ширхэг`} />
                <KvRow
                  label="Нийт үлдэгдэл"
                  value={formatMNT(stats.total_debt)}
                  valueClassName="text-amber-600 dark:text-amber-400 font-semibold"
                />
                <KvRow label="Нийт орлого" value={formatMNT(stats.monthly_income)} valueClassName="text-emerald-700 dark:text-emerald-300 font-semibold" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MegaphoneIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Сүүлийн зарлал
                </CardTitle>
                <CardDescription className="text-sm">Олон сууцанд нийтлэгдсэн мэдэгдэл.</CardDescription>
              </div>
              <Badge variant="secondary">Зарлал</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <AnnouncementsList data={announcements} />
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <WrenchIcon className="size-4 text-rose-600 dark:text-rose-400" />
                  Засварын хүсэлт
                </CardTitle>
                <CardDescription className="text-sm">Шинэ ба явцад байгаа хүсэлтүүд.</CardDescription>
              </div>
              <Badge variant="secondary">Засвар</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <MaintenanceList data={requests} />
            </CardContent>
          </Card>
        </div>
      </AdminShell>
    </>
  );
}

function ProgressRow({ label, pct, tone, hint }: { label: string; pct: number; tone: string; hint?: string }) {
  const safePct = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <div className="flex items-center gap-2">
          {hint ? <span className="text-[11px] text-zinc-500">{hint}</span> : null}
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{safePct}%</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-[width]', tone)}
          style={{ width: `${safePct}%` }}
        />
      </div>
    </div>
  );
}

function KvRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={cn('text-sm font-medium tabular-nums', valueClassName)}>{value}</span>
    </div>
  );
}

function ActivityList({ items }: { items: AdminRecentActivity[] }) {
  if (!items.length) {
    return <EmptyState icon={FileTextIcon} title="Одоогоор үйлдэл алга" description="Төлбөр, засвар, нэхэмжлэл үүсэхэд энд харагдна." />;
  }
  return (
    <div className="flex flex-col">
      {items.map((item, idx) => {
        const tone = kindTone(item.kind);
        return (
          <div key={item.id} className={cn('flex items-start gap-3 py-3', idx !== items.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : '')}>
            <div className={cn('mt-0.5 size-2 rounded-full shrink-0', tone.dot)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.title}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold mr-1.5', tone.badge)}>
                  {kindLabel(item.kind)}
                </span>
                {item.subtitle}
              </p>
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap tabular-nums">
              {relativeTime(item.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function kindLabel(k: AdminRecentActivity['kind']) {
  return activityKindLabel(k);
}

function kindTone(k: AdminRecentActivity['kind']) {
  switch (k) {
    case 'payment': return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' };
    case 'maintenance': return { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' };
    case 'gate': return { dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' };
    case 'invoice': return { dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' };
  }
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

function AnnouncementsList({ data }: { data: Announcement[] }) {
  if (!data.length) {
    return <EmptyState icon={MegaphoneIcon} title="Зарлал байхгүй" description="Шинэ зарлал нийтлэгдэхэд энд харагдна." />;
  }
  return (
    <div className="flex flex-col">
      {data.map((row, idx) => {
        const pinned = !!row.is_pinned;
        return (
          <div key={row.id} className={cn('py-3.5 flex flex-col gap-1.5', idx !== data.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : '')}>
            <div className="flex items-center gap-2">
              {pinned ? (
                <Badge className="text-[10px] uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  ОНЦЛОСОН
                </Badge>
              ) : null}
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{row.title}</span>
              <span className="ml-auto text-[11px] text-zinc-400 whitespace-nowrap tabular-nums shrink-0">
                {relativeTime(row.created_at)}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 whitespace-pre-wrap">
              {row.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function MaintenanceList({ data }: { data: MaintenanceRequest[] }) {
  if (!data.length) {
    return <EmptyState icon={WrenchIcon} title="Хүсэлт байхгүй" description="Одоогоор нээлттэй засварын хүсэлт байхгүй." />;
  }
  return (
    <div className="flex flex-col">
      {data.map((row, idx) => (
        <div key={row.id} className={cn('py-3 flex items-start gap-3', idx !== data.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : '')}>
          <StatusDot status={row.status} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{row.title}</p>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <Badge className={maintenanceStatusBadge(row.status)}>
                {maintenanceStatusLabel(row.status)}
              </Badge>
              <Badge variant="secondary">{maintenanceCategoryLabel(row.category)}</Badge>
              <span className={cn('rounded px-1.5 py-0.5 uppercase tracking-wider font-semibold', priorityBadge(row.priority))}>
                {maintenancePriorityLabel(row.priority)}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-zinc-400 whitespace-nowrap tabular-nums shrink-0">
            {relativeTime(row.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: MaintenanceRequest['status'] }) {
  const tone = status === 'OPEN' ? 'bg-rose-500'
    : status === 'IN_PROGRESS' ? 'bg-amber-500'
    : status === 'ON_HOLD' ? 'bg-zinc-500'
    : status === 'COMPLETED' ? 'bg-emerald-500'
    : 'bg-zinc-400';
  return <div className={cn('mt-1.5 size-2 rounded-full shrink-0', tone)} />;
}

function maintenanceStatusBadge(status: MaintenanceRequest['status']) {
  switch (status) {
    case 'OPEN': return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
    case 'IN_PROGRESS': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
    case 'ON_HOLD': return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
    case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
    case 'CANCELLED': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    default: return '';
  }
}

function priorityBadge(p: MaintenanceRequest['priority']) {
  switch (p) {
    case 'HIGH': return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
    case 'MEDIUM': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
    case 'LOW': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
    default: return '';
  }
}
