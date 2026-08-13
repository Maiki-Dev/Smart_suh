"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { IncidentAdminRow } from "@/lib/incidents/types";
import {
  incidentIssueTypeLabel,
  incidentStatusLabel,
  incidentStatusVariant,
  detectionSourceLabel,
} from "@/lib/incidents/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, maintenancePriorityTone } from "@/components/admin/StatusBadge";
import { maintenancePriorityLabel } from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { AlertTriangle, ArrowRight } from "lucide-react";

export function IncidentsDashboard({
  stats,
  incidents,
}: {
  stats: {
    active_incidents: number;
    critical_count: number;
    high_count: number;
    affected_residents: number;
    avg_resolution_hours: number;
  };
  incidents: IncidentAdminRow[];
}) {
  const active = incidents.filter((i) => !['RESOLVED', 'FALSE_POSITIVE'].includes(i.status));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Идэвхтэй" value={String(stats.active_incidents)} />
        <StatCard label="Critical" value={String(stats.critical_count)} highlight={stats.critical_count > 0} />
        <StatCard label="High" value={String(stats.high_count)} />
        <StatCard label="Нөлөөлсөн орон сууц" value={String(stats.affected_residents)} />
        <StatCard label="Дундаж шийдэх хугацаа" value={`${stats.avg_resolution_hours}ц`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5" />
            Building Incidents
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {active.length === 0 ? (
            <EmptyState title="Идэвхтэй incident байхгүй" description="Шинэ мэдээлэл ирэхэд энд харагдана" />
          ) : (
            active.map((inc) => <IncidentRow key={inc.id} incident={inc} />)
          )}
        </CardContent>
      </Card>

      {incidents.filter((i) => ['RESOLVED', 'FALSE_POSITIVE'].includes(i.status)).length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Түүх</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {incidents
              .filter((i) => ['RESOLVED', 'FALSE_POSITIVE'].includes(i.status))
              .slice(0, 20)
              .map((inc) => (
                <IncidentRow key={inc.id} incident={inc} />
              ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-destructive/50" : undefined}>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function IncidentRow({ incident }: { incident: IncidentAdminRow }) {
  return (
    <Link
      href={`/admin/incidents/${incident.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="font-medium truncate">
          {incident.incident_number} · {incident.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {incidentIssueTypeLabel(incident.category)} · {incident.building_name ?? "—"} ·{" "}
          {incident.report_count} report · {incident.confidence_score}% ·{" "}
          {detectionSourceLabel(incident.detection_source)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge label={maintenancePriorityLabel(incident.priority)} tone={maintenancePriorityTone(incident.priority)} />
        <Badge variant={incidentStatusVariant(incident.status)}>{incidentStatusLabel(incident.status)}</Badge>
        <ArrowRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
