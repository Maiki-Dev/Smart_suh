"use client";

import Link from "next/link";
import type { BuildingTwinSummary } from "@/lib/digital-twin/types";
import { healthGradeLabel } from "@/lib/digital-twin/labels";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

function healthBarColor(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 75) return "bg-emerald-400";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-500";
}

export function DigitalTwinCommandCenter({
  buildingName,
  summary,
  buildingId,
  lastUpdated,
  isLive,
}: {
  buildingName: string;
  summary: BuildingTwinSummary;
  buildingId: string;
  lastUpdated: string;
  isLive: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏢</span>
              <h2 className="text-lg font-semibold">{buildingName}</h2>
              {isLive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Playback
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">{summary.health_score}%</span>
              <span className="text-sm text-muted-foreground">
                {healthGradeLabel(summary.health_grade)}
              </span>
            </div>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full transition-all", healthBarColor(summary.health_score))}
                style={{ width: `${summary.health_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isLive ? "Сүүлд шинэчлэгдсэн" : "Playback цаг"}: {formatDateTimeMn(lastUpdated)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Оршин суугч" value={String(summary.resident_count)} />
            <Metric label="Төлбөр" value={`${summary.payment_rate}%`} />
            <Metric label="Нээлттэй" value={String(summary.open_issues)} sub="асуудал" />
            <Metric
              label="Incident"
              value={String(summary.active_incidents)}
              alert={summary.active_incidents > 0}
            />
            <Metric label="Машин" value={String(summary.vehicle_count)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <QuickLink href={`/admin/incidents?building=${buildingId}`}>Incidents</QuickLink>
          <QuickLink href={`/admin/payments?building=${buildingId}`}>Төлбөр</QuickLink>
          <QuickLink href={`/admin/maintenance?building=${buildingId}`}>Засвар</QuickLink>
          <QuickLink href={`/admin/vehicles?building=${buildingId}`}>Зогсоол</QuickLink>
          <QuickLink href={`/admin/apartments?building=${buildingId}`}>Орон сууц</QuickLink>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums", alert && "text-red-500")}>
        {value}
        {sub ? <span className="ml-1 text-xs font-normal text-muted-foreground">{sub}</span> : null}
      </p>
    </div>
  );
}

function QuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
    >
      {children}
    </Link>
  );
}
