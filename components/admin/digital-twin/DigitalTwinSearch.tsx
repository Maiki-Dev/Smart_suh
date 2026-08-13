"use client";

import { useEffect, useState } from "react";
import type { TwinSearchResult } from "@/lib/digital-twin/types";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<TwinSearchResult["type"], string> = {
  apartment: "Орон сууц",
  resident: "Оршин суугч",
  vehicle: "Машин",
  issue: "Асуудал",
  incident: "Incident",
};

export function DigitalTwinSearch({
  buildingId,
  onSelect,
}: {
  buildingId: string;
  onSelect: (apartmentId: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TwinSearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ q: query, buildingId });
      const res = await fetch(`/api/admin/digital-twin/search?${params}`);
      if (!res.ok) return;
      const json = (await res.json()) as { results: TwinSearchResult[] };
      setResults(json.results);
      setOpen(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, buildingId]);

  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Орон сууц, нэр, улсын дугаар..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="h-8 pl-8 text-sm"
      />
      {open && results.length > 0 ? (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              type="button"
              className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={() => {
                onSelect(r.apartment_id);
                setQuery(r.apartment_number ?? r.label);
                setOpen(false);
              }}
            >
              <span className="font-medium">{r.label}</span>
              <span className="text-xs text-muted-foreground">
                {TYPE_LABELS[r.type]}
                {r.subtitle ? ` · ${r.subtitle}` : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
