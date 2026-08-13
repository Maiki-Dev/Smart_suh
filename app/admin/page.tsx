import { requireAdminRole } from '@/lib/permissions';
import { AdminShell } from '@/components/layout/AdminShell';
import { Badge } from '@/components/ui/badge';
import type { LucideIcon } from 'lucide-react';
import {
  FileText as FileTextIcon,
  Megaphone as MegaphoneIcon,
  Wrench as WrenchIcon,
} from 'lucide-react';
import {
  getAdminOverviewStats,
  getAdminRecentActivity,
  type AdminRecentActivity,
} from '@/lib/queries/dashboard';
import { listAnnouncementsByOrganization } from '@/lib/queries/announcements';
import { listMaintenanceRequestsByOrganization } from '@/lib/queries/maintenance';
import type { Announcement, MaintenanceRequest } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  activityKindLabel,
  maintenanceCategoryLabel,
  maintenancePriorityLabel,
  maintenanceStatusLabel,
} from '@/lib/admin/format';
import {
  DashboardEmptyState,
  DashboardHeroMetric,
  DashboardKvRow,
  DashboardPanel,
  DashboardProgressRow,
  DashboardSecondaryStrip,
} from '@/components/admin/dashboard/AdminDashboardUi';

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

  const announcements = announcementsRes.data;
  const requests = maintenanceRes.data;
  const openInvoices = stats.pending_invoices + stats.overdue_invoices;
  const vehicleTotal = stats.active_vehicles + stats.disabled_vehicles;

  const paymentPct = stats.total_apartments > 0
    ? Math.min(100, Math.round(100 - (openInvoices / Math.max(1, stats.total_apartments)) * 100))
    : 0;

  const vehiclePct = vehicleTotal > 0
    ? Math.round((100 * stats.active_vehicles) / vehicleTotal)
    : 0;

  return (
    <AdminShell
      ctx={ctx}
      activeSegment=""
      pageTitle="Хянах самбар"
      pageSubtitle={`${ctx.user.organization?.name ?? 'Байгууллага'} — Бүх мэдээлэл`}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardHeroMetric
            label="Орон сууц"
            value={stats.total_apartments}
            detail={`${stats.total_residents} оршин суугч`}
          />
          <DashboardHeroMetric
            label="Оршин суугч"
            value={stats.total_residents}
            detail="Идэвхтэй бүртгэлтэй"
          />
          <DashboardHeroMetric
            label="Сарын орлого"
            value={formatMNT(stats.monthly_income)}
            detail="Төлсөн дүн"
            emphasis={stats.monthly_income > 0 ? 'positive' : 'default'}
          />
          <DashboardHeroMetric
            label="Төлбөрийн үлдэгдэл"
            value={formatMNT(stats.total_debt)}
            detail={`${stats.overdue_invoices} хугацаа хэтэрсэн · ${stats.pending_invoices} хүлээгдэж буй`}
            emphasis={stats.total_debt > 0 ? 'warning' : 'default'}
          />
        </div>

        <DashboardSecondaryStrip
          items={[
            {
              label: 'Идэвхтэй машин',
              value: stats.active_vehicles,
              detail: 'Зогсоолын эрх идэвхтэй',
            },
            {
              label: 'Идэвхгүй машин',
              value: stats.disabled_vehicles,
              detail: 'Эрх хаагдсан',
            },
            {
              label: 'Нээлттэй засвар',
              value: stats.open_maintenance,
              detail: 'Нээлттэй / Явцад / Түр зогссон',
              alert: stats.open_maintenance > 0,
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DashboardPanel
            className="lg:col-span-2"
            title="Сүүлийн үйлдэл"
            description="Төлбөр, засвар, зогсоол, нэхэмжлэл"
            action={
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {activity.length} бичлэг
              </span>
            }
          >
            <ActivityList items={activity} />
          </DashboardPanel>

          <DashboardPanel title="Тойм" description="Төлбөр, зогсоол, засвар">
            <DashboardProgressRow
              label="Төлбөр төлөлт"
              pct={paymentPct}
              hint={stats.total_apartments > 0 ? `${stats.total_apartments} орон сууц` : undefined}
            />
            <DashboardProgressRow
              label="Зогсоолын идэвхжил"
              pct={vehiclePct}
              hint={`${stats.active_vehicles} идэвхтэй`}
            />
            <DashboardProgressRow
              label="Засвар шийдвэрлэлт"
              pct={stats.open_maintenance === 0 ? 100 : Math.max(0, 100 - stats.open_maintenance * 20)}
              hint={`${stats.open_maintenance} нээлттэй`}
            />
            <div className="border-t border-border py-1">
              <DashboardKvRow label="Нээлттэй нэхэмжлэл" value={`${openInvoices} ширхэг`} />
              <DashboardKvRow
                label="Нийт үлдэгдэл"
                value={formatMNT(stats.total_debt)}
                valueClassName={stats.total_debt > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
              />
              <DashboardKvRow
                label="Сарын орлого"
                value={formatMNT(stats.monthly_income)}
                valueClassName={stats.monthly_income > 0 ? 'text-primary' : undefined}
              />
            </div>
          </DashboardPanel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardPanel
            title="Сүүлийн зарлал"
            description="Орон сууцны мэдэгдэл"
            action={<Badge variant="secondary">Зарлал</Badge>}
          >
            <AnnouncementsList data={announcements} />
          </DashboardPanel>

          <DashboardPanel
            title="Засварын хүсэлт"
            description="Шинэ ба явцад байгаа"
            action={<Badge variant="secondary">Засвар</Badge>}
          >
            <MaintenanceList data={requests} />
          </DashboardPanel>
        </div>
      </div>
    </AdminShell>
  );
}

function ActivityList({ items }: { items: AdminRecentActivity[] }) {
  if (!items.length) {
    return (
      <DashboardEmptyState
        icon={FileTextIcon}
        title="Одоогоор үйлдэл алга"
        description="Төлбөр, засвар, нэхэмжлэл үүсэхэд энд харагдана."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 py-3.5">
          <span className={cn('mt-2 size-1.5 shrink-0 rounded-full', kindTone(item.kind))} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              <span className="text-foreground/70">{kindLabel(item.kind)}</span>
              {item.subtitle ? ` · ${item.subtitle}` : null}
            </p>
          </div>
          <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {relativeTime(item.created_at)}
          </time>
        </div>
      ))}
    </div>
  );
}

function kindLabel(k: AdminRecentActivity['kind']) {
  return activityKindLabel(k);
}

function kindTone(k: AdminRecentActivity['kind']) {
  switch (k) {
    case 'payment':
      return 'bg-primary';
    case 'maintenance':
      return 'bg-amber-500';
    case 'gate':
      return 'bg-foreground/30';
    case 'invoice':
      return 'bg-foreground/50';
  }
}

function AnnouncementsList({ data }: { data: Announcement[] }) {
  if (!data.length) {
    return (
      <DashboardEmptyState
        icon={MegaphoneIcon}
        title="Зарлал байхгүй"
        description="Шинэ зарлал нийтлэгдэхэд энд харагдана."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {data.map((row) => (
        <article key={row.id} className="space-y-1.5 py-3.5">
          <div className="flex items-center gap-2">
            {row.is_pinned ? (
              <Badge variant="outline" className="text-[10px]">
                Онцлох
              </Badge>
            ) : null}
            <h3 className="min-w-0 flex-1 truncate text-sm font-medium">{row.title}</h3>
            <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {relativeTime(row.created_at)}
            </time>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {row.content}
          </p>
        </article>
      ))}
    </div>
  );
}

function MaintenanceList({ data }: { data: MaintenanceRequest[] }) {
  if (!data.length) {
    return (
      <DashboardEmptyState
        icon={WrenchIcon}
        title="Хүсэлт байхгүй"
        description="Одоогоор нээлттэй засварын хүсэлт байхгүй."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {data.map((row) => (
        <Link
          key={row.id}
          href={`/admin/maintenance/${row.id}`}
          className="-mx-1 flex items-start gap-3 rounded-lg px-1 py-3.5 transition-colors hover:bg-muted/50"
        >
          <StatusDot status={row.status} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{row.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{maintenanceStatusLabel(row.status)}</span>
              <span>·</span>
              <span>{maintenanceCategoryLabel(row.category)}</span>
              <span>·</span>
              <span className={priorityTone(row.priority)}>{maintenancePriorityLabel(row.priority)}</span>
            </div>
          </div>
          <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {relativeTime(row.created_at)}
          </time>
        </Link>
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: MaintenanceRequest['status'] }) {
  const tone =
    status === 'OPEN'
      ? 'bg-amber-500'
      : status === 'IN_PROGRESS'
        ? 'bg-primary'
        : status === 'ON_HOLD'
          ? 'bg-muted-foreground/50'
          : status === 'COMPLETED'
            ? 'bg-primary/40'
            : 'bg-muted-foreground/30';

  return <span className={cn('mt-2 size-1.5 shrink-0 rounded-full', tone)} />;
}

function priorityTone(p: MaintenanceRequest['priority']) {
  switch (p) {
    case 'HIGH':
      return 'text-amber-600 dark:text-amber-400';
    case 'MEDIUM':
      return 'text-foreground/80';
    case 'LOW':
      return 'text-muted-foreground';
    default:
      return '';
  }
}
