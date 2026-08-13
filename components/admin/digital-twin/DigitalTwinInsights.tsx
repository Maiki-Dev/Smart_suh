"use client";

import type { TwinInsight } from "@/lib/digital-twin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DigitalTwinInsights({ insights }: { insights: TwinInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Smart Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((ins) => (
          <div
            key={ins.id}
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              ins.severity === "critical" && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
              ins.severity === "warning" && "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
            )}
          >
            <span className="mr-1.5">{ins.icon}</span>
            {ins.message}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
