import Link from "next/link";
import {
  Bell,
  Car,
  Check,
  CreditCard,
  Megaphone,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ResidentDashboardPanel,
  ResidentEmptyHint,
  ResidentHeroMetric,
  ResidentPanelLink,
  ResidentQuickAction,
} from "@/components/resident/dashboard/ResidentDashboardUi";
import {
  aggregateInvoiceTotals,
  sumFeeBreakdown,
  type FeeBreakdown,
} from "@/lib/fees/apartment-fees";
import { formatMNT, invoiceStatusLabel, vehicleTypeLabel } from "@/lib/admin/format";
import { formatDateMn } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/types";
import type { ResidentOverviewStats } from "@/lib/queries/dashboard";

type VehicleRow = {
  id: string;
  plate_number: string;
  vehicle_type: string;
  active: boolean;
  gate_access: boolean;
  rfid_number: string | null;
};

function relativeTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "саяхан";
  if (min < 60) return `${min} мин өмнө`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} цаг өмнө`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} өдөр өмнө`;
  return `${Math.floor(d / 30)} сар өмнө`;
}

function feeRows(fees: FeeBreakdown) {
  return [
    { label: "Байр", amount: fees.apartment_fee },
    { label: "Зогсоол", amount: fees.parking_fee },
    { label: "Ус", amount: fees.water_fee },
    { label: "Цахилгаан", amount: fees.electricity_fee },
  ];
}

export function ResidentHomePaymentCard({
  fees,
  summary,
  hasDebt,
}: {
  fees: FeeBreakdown;
  summary: ReturnType<typeof aggregateInvoiceTotals> | null;
  hasDebt: boolean;
}) {
  const total = sumFeeBreakdown(fees);
  const status = summary?.status;

  return (
    <ResidentDashboardPanel
      title="Энэ сарын төлбөр"
      description="Одоогийн сарын нэхэмжлэл — байр, зогсоол, ус, цахилгаан"
      action={
        status ? (
          <Badge variant="secondary" className="font-normal">
            {invoiceStatusLabel(status)}
          </Badge>
        ) : null
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {feeRows(fees).map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5 text-sm"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold tabular-nums">{formatMNT(row.amount)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-medium">Нийт</span>
        <span className="text-xl font-semibold tabular-nums">{formatMNT(total)}</span>
      </div>

      {summary ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="tabular-nums">Төлсөн: {formatMNT(summary.paid_amount)}</span>
          <span className={cn("tabular-nums", summary.remaining_amount > 0 && "text-amber-600 dark:text-amber-400")}>
            Үлдэгдэл: {formatMNT(summary.remaining_amount)}
          </span>
        </div>
      ) : null}

      <div className="mt-5">
        <Link
          href="/resident/payments"
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto sm:min-w-[12rem]",
          )}
        >
          <CreditCard className="size-4" />
          {hasDebt ? "Төлбөр төлөх" : "Төлбөр харах"}
        </Link>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Өмнөх саруудын нэхэмжлэл, төлбөрийн түүхийг{" "}
        <Link href="/resident/payments" className="font-medium text-primary hover:underline">
          Төлбөр
        </Link>{" "}
        хуудаснаас харна.
      </p>
    </ResidentDashboardPanel>
  );
}

export function ResidentHomeOverview({
  overview,
  userName,
  fees,
  summary,
  announcements,
  vehicles,
}: {
  overview: ResidentOverviewStats;
  userName: string;
  fees: FeeBreakdown | null;
  summary: ReturnType<typeof aggregateInvoiceTotals> | null;
  announcements: Announcement[];
  vehicles: VehicleRow[];
}) {
  const apt = overview.apartment;
  const aptLabel = apt ? [apt.tower, apt.apartment_number].filter(Boolean).join(" · ") : "—";
  const aptDetail = apt
    ? [apt.entrance && `Орц ${apt.entrance}`, apt.floor && `${apt.floor} давхар`, apt.area_m2 && `${apt.area_m2} м²`]
        .filter(Boolean)
        .join(" · ")
    : "Админаас холбох шаардлагатай";
  const hasDebt = overview.total_debt > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ResidentHeroMetric label="Миний орон сууц" value={aptLabel} detail={aptDetail} />
        <ResidentHeroMetric
          label="Нийт үлдэгдэл"
          value={formatMNT(overview.total_debt)}
          detail={hasDebt ? "Төлбөр төлөх шаардлагатай" : "Бүх төлбөр төлөгдсөн"}
          emphasis={hasDebt ? "warning" : "positive"}
        />
        <ResidentHeroMetric
          label={userName}
          value={`${overview.unread_notifications} мэдэгдэл`}
          detail={`${overview.open_maintenance_requests} нээлттэй засвар`}
        />
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Түргэн үйлдэл</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <ResidentQuickAction href="/resident/payments" icon={CreditCard} label="Төлбөр" hint="Төлөх, түүх харах" />
          <ResidentQuickAction
            href="/resident/maintenance"
            icon={Wrench}
            label="Засвар"
            hint={`${overview.open_maintenance_requests} нээлттэй`}
          />
          <ResidentQuickAction
            href="/resident/visitors"
            icon={UserPlus}
            label="Зочин"
            hint={`${overview.active_visitor_passes} идэвхтэй`}
          />
          <ResidentQuickAction
            href="/resident/notifications"
            icon={Bell}
            label="Мэдэгдэл"
            hint={`${overview.unread_notifications} шинэ`}
          />
        </div>
      </div>

      {fees ? (
        <ResidentHomePaymentCard fees={fees} summary={summary} hasDebt={hasDebt} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ResidentDashboardPanel
            title="Зарлал"
            description="СӨХ-ийн мэдэгдэл"
            action={<ResidentPanelLink href="/resident/announcements">Бүгд →</ResidentPanelLink>}
          >
            <AnnouncementFeed data={announcements} />
          </ResidentDashboardPanel>
        </div>

        <ResidentDashboardPanel
          title="Машин"
          description="Зогсоолын эрх"
          action={<ResidentPanelLink href="/resident/vehicle">Дэлгэрэнгүй →</ResidentPanelLink>}
        >
          <VehicleList vehicles={vehicles} />
        </ResidentDashboardPanel>
      </div>
    </div>
  );
}

function VehicleList({ vehicles }: { vehicles: VehicleRow[] }) {
  if (!vehicles.length) {
    return (
      <ResidentEmptyHint
        icon={Car}
        title="Машин бүртгэлгүй"
        description="Машинаа бүртгүүлсний дараа энд харагдана."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {vehicles.map((v) => (
        <div key={v.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="font-medium tabular-nums">{v.plate_number}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {vehicleTypeLabel(v.vehicle_type)} · {v.gate_access ? "Зогсоол идэвхтэй" : "Зогсоол идэвхгүй"}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[11px]">
            {v.active ? (
              <>
                <Check className="size-3" /> Идэвхтэй
              </>
            ) : (
              <>
                <X className="size-3" /> Идэвхгүй
              </>
            )}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function AnnouncementFeed({ data }: { data: Announcement[] }) {
  if (!data.length) {
    return (
      <ResidentEmptyHint
        icon={Megaphone}
        title="Зарлал байхгүй"
        description="Шинэ зарлал нийтлэгдэхэд энд харагдана."
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.map((row) => (
        <article
          key={row.id}
          className={cn(
            "rounded-lg border border-border px-4 py-3",
            row.is_pinned && "border-amber-200/80 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {row.is_pinned ? (
                <Badge variant="outline" className="mb-1.5 text-[10px]">
                  Онцлох
                </Badge>
              ) : null}
              <h3 className="text-sm font-medium">{row.title}</h3>
            </div>
            <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {relativeTime(row.created_at)}
            </time>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {row.content}
          </p>
          {row.published_at ? (
            <p className="mt-2 text-[11px] text-muted-foreground">{formatDateMn(row.published_at)}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
