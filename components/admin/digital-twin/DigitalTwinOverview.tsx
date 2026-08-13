"use client";

import Link from "next/link";
import type { BuildingTwinOverview } from "@/lib/digital-twin/types";
import { healthGradeLabel } from "@/lib/digital-twin/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function healthColor(score: number): string {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-emerald-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

export function DigitalTwinOverview({ buildings }: { buildings: BuildingTwinOverview[] }) {
  if (buildings.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Барилга байхгүй"
        description="Эхлээд барилга болон орон сууц бүртгэнэ үү."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <h2 className="text-lg font-semibold tracking-tight">SMART BUILDING</h2>
        <p className="text-sm text-muted-foreground">
          Барилга сонгоод интерактив live map-ийг нээнэ үү.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {buildings.map((b) => (
          <Link key={b.id} href={`/admin/digital-twin/${b.id}`}>
            <Card className="group transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-5 text-muted-foreground" />
                    <CardTitle className="text-base">{b.name}</CardTitle>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-3xl font-bold tabular-nums", healthColor(b.health_score))}>
                    {b.health_score}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {healthGradeLabel(b.health_grade)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{b.apartment_count} орон сууц</span>
                  {b.active_incidents > 0 ? (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <AlertTriangle className="size-3" />
                      {b.active_incidents} incident
                    </Badge>
                  ) : null}
                </div>
                {b.address ? (
                  <p className="text-xs text-muted-foreground truncate">{b.address}</p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
