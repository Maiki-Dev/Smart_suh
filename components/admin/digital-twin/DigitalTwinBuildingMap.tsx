"use client";

import Link from "next/link";
import type { BuildingTwinData, BuildingTwinSummary, TwinLayer } from "@/lib/digital-twin/types";
import { DigitalTwinCommandCenter } from "./DigitalTwinCommandCenter";
import { DigitalTwinLayerControls } from "./DigitalTwinLayerControls";
import { DigitalTwinFloorGrid } from "./DigitalTwinFloorGrid";
import { DigitalTwinApartmentPanel } from "./DigitalTwinApartmentPanel";
import { DigitalTwinInsights } from "./DigitalTwinInsights";
import { DigitalTwinTimeline } from "./DigitalTwinTimeline";
import { DigitalTwinSearch } from "./DigitalTwinSearch";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 30_000;

export function DigitalTwinBuildingMap({
  buildingId,
  initialData,
}: {
  buildingId: string;
  initialData: BuildingTwinData;
}) {
  const [data, setData] = useState(initialData);
  const [layer, setLayer] = useState<TwinLayer>("overall");
  const [entrance, setEntrance] = useState<string | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [highlightApartmentId, setHighlightApartmentId] = useState<string | null>(null);
  const [playbackAt, setPlaybackAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lastUpdated, setLastUpdated] = useState(data.recorded_at);

  const fetchData = useCallback(
    (opts?: { entrance?: string | null; playbackAt?: string | null }) => {
      const params = new URLSearchParams();
      const ent = opts?.entrance !== undefined ? opts.entrance : entrance;
      const pb = opts?.playbackAt !== undefined ? opts.playbackAt : playbackAt;
      if (ent) params.set("entrance", ent);
      if (pb) params.set("playbackAt", pb);

      startTransition(async () => {
        try {
          const res = await fetch(
            `/api/admin/digital-twin/building/${buildingId}?${params.toString()}`,
          );
          if (!res.ok) return;
          const json = (await res.json()) as BuildingTwinData;
          setData(json);
          setLastUpdated(json.recorded_at);
        } catch {
          /* ignore poll errors */
        }
      });
    },
    [buildingId, entrance, playbackAt],
  );

  useEffect(() => {
    if (playbackAt) return;
    const id = setInterval(() => fetchData(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData, playbackAt]);

  const filteredApartments = entrance
    ? data.apartments.filter((a) => a.entrance === entrance)
    : data.apartments;

  const handleEntranceChange = (value: string | null) => {
    setEntrance(value);
    fetchData({ entrance: value });
  };

  const handlePlaybackChange = (value: string | null) => {
    setPlaybackAt(value);
    fetchData({ playbackAt: value });
  };

  const handleSearchSelect = (apartmentId: string | null) => {
    if (!apartmentId) return;
    setHighlightApartmentId(apartmentId);
    setSelectedApartmentId(apartmentId);
    setTimeout(() => setHighlightApartmentId(null), 3000);
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/digital-twin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Бүх барилга
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData()}
          disabled={pending}
          className="ml-auto gap-1"
        >
          <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
          Шинэчлэх
        </Button>
      </div>

      <DigitalTwinCommandCenter
        buildingName={data.building.name}
        summary={data.summary}
        buildingId={buildingId}
        lastUpdated={lastUpdated}
        isLive={!playbackAt}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DigitalTwinSearch
              buildingId={buildingId}
              onSelect={handleSearchSelect}
            />
            <DigitalTwinLayerControls layer={layer} onLayerChange={setLayer} />
          </div>

          <div className="flex flex-wrap gap-2">
            <EntranceFilter
              entrances={data.entrances}
              value={entrance}
              onChange={handleEntranceChange}
            />
            <PlaybackFilter value={playbackAt} onChange={handlePlaybackChange} />
          </div>

          {data.active_incidents.length > 0 ? (
            <IncidentBanner incidents={data.active_incidents} buildingId={buildingId} />
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {data.building.name} — Interactive Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DigitalTwinFloorGrid
                apartments={filteredApartments}
                floors={data.floors}
                layer={layer}
                selectedApartmentId={selectedApartmentId}
                highlightApartmentId={highlightApartmentId}
                activeIncidents={data.active_incidents}
                onSelect={setSelectedApartmentId}
              />
            </CardContent>
          </Card>

          <DigitalTwinInsights insights={data.insights} />
          <DigitalTwinTimeline events={data.timeline} />
        </div>

        <div
          className={cn(
            "lg:sticky lg:top-4 lg:self-start",
            selectedApartmentId ? "block" : "hidden lg:block",
          )}
        >
          <DigitalTwinApartmentPanel
            apartmentId={selectedApartmentId}
            onClose={() => setSelectedApartmentId(null)}
          />
        </div>
      </div>
    </div>
  );
}

function EntranceFilter({
  entrances,
  value,
  onChange,
}: {
  entrances: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  if (entrances.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Орц:</span>
      <FilterChip active={!value} onClick={() => onChange(null)}>
        Бүгд
      </FilterChip>
      {entrances.map((e) => (
        <FilterChip key={e} active={value === e} onClick={() => onChange(e)}>
          {e}
        </FilterChip>
      ))}
    </div>
  );
}

function PlaybackFilter({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Playback:</span>
      <input
        type="datetime-local"
        className="h-8 rounded-md border bg-background px-2 text-xs"
        value={value ? value.slice(0, 16) : ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v ? new Date(v).toISOString() : null);
        }}
      />
      {value ? (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onChange(null)}>
          Live
        </Button>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      {children}
    </button>
  );
}

function IncidentBanner({
  incidents,
  buildingId,
}: {
  incidents: BuildingTwinData["active_incidents"];
  buildingId: string;
}) {
  const inc = incidents[0];
  if (!inc) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 dark:border-red-900 dark:bg-red-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            🔴 {inc.title} ({inc.incident_number})
          </p>
          {inc.floor_min != null && inc.floor_max != null ? (
            <p className="text-xs text-muted-foreground">
              Давхар: {inc.floor_min}–{inc.floor_max} · {inc.report_count} мэдээлэл
            </p>
          ) : null}
        </div>
        <Link
          href={`/admin/incidents/${inc.id}`}
          className="text-xs font-medium text-red-600 hover:underline"
        >
          Дэлгэрэнгүй →
        </Link>
      </div>
    </div>
  );
}
