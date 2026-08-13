"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { BuildingIncident } from "@/lib/incidents/types";
import type { MaintenanceRequest } from "@/types";
import {
  confirmIncidentAction,
  resolveIncidentAction,
  falsePositiveIncidentAction,
  assignIncidentAction,
  type IncidentActionState,
} from "@/app/admin/incidents/actions";
import {
  incidentIssueTypeLabel,
  incidentStatusLabel,
  incidentStatusVariant,
  detectionSourceLabel,
  locationMatchLabel,
} from "@/lib/incidents/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, maintenancePriorityTone } from "@/components/admin/StatusBadge";
import { maintenancePriorityLabel, maintenanceStatusLabel } from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function IncidentDetailPanel({
  incident,
  issues,
  timeline,
  affectedAreas,
  operators,
}: {
  incident: BuildingIncident;
  issues: Array<
    MaintenanceRequest & {
      similarity_score: number;
      location_match: string | null;
      apartment_number: string;
      building_name: string | null;
      floor: number | null;
    }
  >;
  timeline: Array<{ id: string; event_type: string; description: string; created_at: string }>;
  affectedAreas: Array<{ apartment_number?: string; floor?: number | null; building_name?: string | null }>;
  operators: Array<{ id: string; first_name: string; last_name: string }>;
}) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<IncidentActionState>) => {
    startTransition(async () => {
      await fn();
      window.location.reload();
    });
  };

  const floorLabel =
    incident.floor_min != null && incident.floor_max != null
      ? incident.floor_min === incident.floor_max
        ? `${incident.floor_min}-р давхар`
        : `${incident.floor_min}–${incident.floor_max} давхар`
      : "—";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link href="/admin/incidents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Буцах
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">🚨 {incident.title}</h2>
          <p className="text-sm text-muted-foreground">{incident.incident_number}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={maintenancePriorityLabel(incident.priority)} tone={maintenancePriorityTone(incident.priority)} />
          <Badge variant={incidentStatusVariant(incident.status)}>{incidentStatusLabel(incident.status)}</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Confidence" value={`${incident.confidence_score}%`} />
        <InfoCard label="Reports" value={String(incident.report_count)} />
        <InfoCard label="Affected apts" value={String(incident.affected_apartment_count)} />
        <InfoCard label="Detection" value={detectionSourceLabel(incident.detection_source)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            {incidentIssueTypeLabel(incident.category)} · {floorLabel} · {formatDateTimeMn(incident.detected_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!['RESOLVED', 'FALSE_POSITIVE', 'CONFIRMED'].includes(incident.status) ? (
            <Button size="sm" disabled={pending} onClick={() => run(() => confirmIncidentAction(incident.id))}>
              Confirm
            </Button>
          ) : null}
          {!['RESOLVED', 'FALSE_POSITIVE'].includes(incident.status) ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resolveIncidentAction(incident.id))}>
              Mark Resolved
            </Button>
          ) : null}
          {incident.status !== 'FALSE_POSITIVE' ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => falsePositiveIncidentAction(incident.id))}>
              False Positive
            </Button>
          ) : null}
          {operators.length > 0 ? (
            <select
              className="h-8 rounded-md border px-2 text-sm"
              defaultValue={incident.assigned_to ?? ""}
              onChange={(e) => run(() => assignIncidentAction(incident.id, e.target.value))}
              disabled={pending}
            >
              <option value="">Assign team...</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>{op.first_name} {op.last_name}</option>
              ))}
            </select>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Affected Area Map</CardTitle></CardHeader>
        <CardContent>
          <FloorGrid issues={issues} floorMin={incident.floor_min} floorMax={incident.floor_max} />
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {affectedAreas.map((a, i) => (
              <Badge key={i} variant="outline">
                {a.apartment_number ?? `Floor ${a.floor}`}
              </Badge>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Related Reports ({issues.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {issues.map((issue) => (
            <Link
              key={issue.id}
              href={`/admin/maintenance/${issue.id}`}
              className="block rounded border p-3 text-sm hover:bg-muted/50"
            >
              <p className="font-medium">{issue.apartment_number} — {issue.title}</p>
              <p className="text-muted-foreground">
                {maintenanceStatusLabel(issue.status)} · {formatDateTimeMn(issue.created_at)}
                {issue.location_match ? ` · ${locationMatchLabel(issue.location_match as 'SAME_FLOOR')}` : ""}
                {issue.similarity_score ? ` · ${issue.similarity_score}%` : ""}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-3 border-l-2 border-border pl-4">
            {timeline.map((ev) => (
              <li key={ev.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
                <p className="text-xs text-muted-foreground">{formatDateTimeMn(ev.created_at)}</p>
                <p>{ev.description}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function FloorGrid({
  issues,
  floorMin,
  floorMax,
}: {
  issues: Array<{ apartment_number: string; floor: number | null }>;
  floorMin: number | null;
  floorMax: number | null;
}) {
  if (floorMin == null || floorMax == null) {
    return <p className="text-sm text-muted-foreground">Floor data unavailable</p>;
  }

  const affectedApts = new Set(issues.map((i) => i.apartment_number));
  const floors: number[] = [];
  for (let f = floorMax; f >= floorMin; f--) floors.push(f);

  return (
    <div className="space-y-1 font-mono text-sm">
      {floors.map((floor) => (
        <div key={floor} className="flex items-center gap-2">
          <span className="w-8 text-muted-foreground">{floor}F</span>
          <div className="flex gap-1">
            {issues
              .filter((i) => i.floor === floor)
              .map((i) => (
                <span
                  key={i.apartment_number}
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded text-[10px]",
                    affectedApts.has(i.apartment_number) ? "bg-destructive text-white" : "bg-muted",
                  )}
                  title={i.apartment_number}
                >
                  •
                </span>
              ))}
            {issues.filter((i) => i.floor === floor).length === 0 ? (
              <span className="text-muted-foreground text-xs">—</span>
            ) : null}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-2">🔴 = affected apartment</p>
    </div>
  );
}
