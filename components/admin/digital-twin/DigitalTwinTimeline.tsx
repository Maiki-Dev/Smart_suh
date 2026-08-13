"use client";

import type { BuildingEvent } from "@/lib/digital-twin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeMn } from "@/lib/format/datetime";

export function DigitalTwinTimeline({ events }: { events: BuildingEvent[] }) {
  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Building Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0 border-l-2 border-muted pl-4">
          {events.map((ev) => (
            <div key={ev.id} className="relative pb-4 last:pb-0">
              <span className="absolute -left-[1.3rem] top-1 size-2 rounded-full bg-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">{formatDateTimeMn(ev.occurred_at)}</p>
              <p className="text-sm font-medium">{ev.title}</p>
              {ev.description ? (
                <p className="text-xs text-muted-foreground">{ev.description}</p>
              ) : null}
              {ev.apartment_number ? (
                <p className="text-xs text-muted-foreground">Орон сууц: {ev.apartment_number}</p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
