"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { gateActionLabel } from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import type { GateAccessLogAdminRow } from "@/lib/queries/gate_access_logs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function GateAccessManagement({
  logs,
  filters,
  total,
}: {
  logs: GateAccessLogAdminRow[];
  filters: { q?: string; action?: string; apartment?: string };
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Зогсоолын түүх</CardTitle>
        <p className="text-sm text-zinc-500 mt-1">Нийт {total} бичлэг</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form method="get" className="grid gap-3 lg:grid-cols-4">
          <Input name="q" placeholder="Хайлт..." defaultValue={filters.q ?? ""} className="lg:col-span-2" />
          <select
            name="action"
            defaultValue={filters.action ?? ""}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">Бүх үйлдэл</option>
            <option value="ENTER">Орсон</option>
            <option value="EXIT">Гарсан</option>
            <option value="DENIED">Хориглосон</option>
          </select>
          <Button type="submit" variant="outline">
            Шүүх
          </Button>
        </form>

        <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60">
              <tr>
                <th className="px-3 py-3">Огноо</th>
                <th className="px-3 py-3">Машин</th>
                <th className="px-3 py-3">Орон сууц</th>
                <th className="px-3 py-3">Үйлдэл</th>
                <th className="px-3 py-3">Шалтгаан</th>
                <th className="px-3 py-3">Эх үүсвэр</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-zinc-500">
                    Түүх байхгүй
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatDateTimeMn(log.created_at)}
                    </td>
                    <td className="px-3 py-3">{log.plate_number ?? "—"}</td>
                    <td className="px-3 py-3">
                      {[log.building_name, log.apartment_number].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge label={gateActionLabel(log.action)} tone={log.action === "DENIED" ? "rose" : "emerald"} />
                    </td>
                    <td className="px-3 py-3 max-w-sm text-xs text-zinc-600 dark:text-zinc-400">{log.reason ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{log.triggered_by ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
