"use client";

import type { ApartmentTwinCell, IncidentTwinSummary, TwinLayer } from "@/lib/digital-twin/types";
import { layerColorClass } from "@/lib/digital-twin/labels";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export function DigitalTwinFloorGrid({
  apartments,
  floors,
  layer,
  selectedApartmentId,
  highlightApartmentId,
  activeIncidents,
  onSelect,
}: {
  apartments: ApartmentTwinCell[];
  floors: number[];
  layer: TwinLayer;
  selectedApartmentId: string | null;
  highlightApartmentId: string | null;
  activeIncidents: IncidentTwinSummary[];
  onSelect: (id: string) => void;
}) {
  const affectedIds = useMemo(() => {
    const set = new Set<string>();
    for (const inc of activeIncidents) {
      for (const id of inc.affected_apartment_ids) set.add(id);
    }
    return set;
  }, [activeIncidents]);

  const incidentFloors = useMemo(() => {
    const set = new Set<number>();
    for (const inc of activeIncidents) {
      if (inc.floor_min != null && inc.floor_max != null) {
        for (let f = inc.floor_min; f <= inc.floor_max; f++) set.add(f);
      }
    }
    return set;
  }, [activeIncidents]);

  const byFloor = useMemo(() => {
    const map = new Map<number, ApartmentTwinCell[]>();
    for (const apt of apartments) {
      const floor = apt.floor ?? 0;
      if (!map.has(floor)) map.set(floor, []);
      map.get(floor)!.push(apt);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.apartment_number.localeCompare(b.apartment_number));
    }
    return map;
  }, [apartments]);

  const displayFloors =
    floors.length > 0 ? floors : [...byFloor.keys()].sort((a, b) => b - a);

  if (apartments.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Орон сууц олдсонгүй</p>;
  }

  const maxCells = Math.max(...displayFloors.map((f) => byFloor.get(f)?.length ?? 0), 1);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[280px] space-y-1 font-mono text-sm">
        {displayFloors.map((floor) => {
          const row = byFloor.get(floor) ?? [];
          const isIncidentFloor = incidentFloors.has(floor);

          return (
            <div
              key={floor}
              className={cn(
                "flex items-center gap-2 rounded px-1 py-0.5",
                isIncidentFloor && layer === "incidents" && "bg-red-500/5",
              )}
            >
              <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                {floor > 0 ? `${floor}F` : "—"}
              </span>
              <div
                className="grid flex-1 gap-1"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(2.5rem, 1fr))`,
                }}
              >
                {row.map((apt) => {
                  const color = apt.layers[layer];
                  const isSelected = selectedApartmentId === apt.id;
                  const isHighlighted = highlightApartmentId === apt.id;
                  const isAffected = affectedIds.has(apt.id);

                  return (
                    <button
                      key={apt.id}
                      type="button"
                      title={`${apt.apartment_number} · ${apt.health_score}%`}
                      onClick={() => onSelect(apt.id)}
                      className={cn(
                        "relative flex h-8 min-w-[2.5rem] items-center justify-center rounded text-[10px] font-medium transition-all",
                        layerColorClass(color),
                        isSelected && "ring-2 ring-primary ring-offset-1",
                        isHighlighted && "animate-pulse ring-2 ring-amber-400 ring-offset-1",
                        isAffected && layer !== "incidents" && "ring-1 ring-red-400/50",
                      )}
                    >
                      {apt.apartment_number.slice(-2)}
                    </button>
                  );
                })}
                {row.length === 0
                  ? Array.from({ length: Math.min(maxCells, 4) }).map((_, i) => (
                      <div key={i} className="h-8" />
                    ))
                  : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {apartments.length} орон сууц · Давхар бүрт grid cell дээр дарж дэлгэрэнгүй харах
      </p>
    </div>
  );
}
