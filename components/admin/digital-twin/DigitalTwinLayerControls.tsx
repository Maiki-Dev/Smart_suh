"use client";

import type { TwinLayer } from "@/lib/digital-twin/types";
import { twinLayerLabel, layerLegend } from "@/lib/digital-twin/labels";
import { cn } from "@/lib/utils";

const LAYERS: TwinLayer[] = [
  "overall",
  "payment",
  "issues",
  "incidents",
  "parking",
  "maintenance",
  "occupancy",
];

export function DigitalTwinLayerControls({
  layer,
  onLayerChange,
}: {
  layer: TwinLayer;
  onLayerChange: (l: TwinLayer) => void;
}) {
  const legend = layerLegend(layer);

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-1">
        {LAYERS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onLayerChange(l)}
            className={cn(
              "rounded-md px-2 py-1 text-xs transition-colors",
              layer === l
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {twinLayerLabel(l)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {legend.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <LegendDot color={item.color} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color }: { color: string }) {
  const cls =
    color === "green"
      ? "bg-emerald-500"
      : color === "yellow"
        ? "bg-amber-400"
        : color === "red"
          ? "bg-red-500"
          : color === "white"
            ? "border border-border bg-background"
            : "bg-muted-foreground/40";
  return <span className={cn("inline-block size-2 rounded-sm", cls)} />;
}
