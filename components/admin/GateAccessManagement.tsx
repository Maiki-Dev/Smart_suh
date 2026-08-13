"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { gateActionLabel } from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import type { GateAccessLogAdminRow } from "@/lib/queries/gate_access_logs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { erpSelectClassName } from "@/components/ui/erp-dialog";
import { syncGateAccessAction } from "@/app/admin/gate-access/actions";
import { notifyActionResult } from "@/lib/hooks/use-action-toast";
import { PaginationFormFields, TablePagination } from "@/components/admin/TablePagination";
import { ParkingTabs } from "@/components/admin/ParkingTabs";
import { AdminPrimaryAction, AdminSectionToolbar } from "@/components/admin/AdminSectionToolbar";
import { cn } from "@/lib/utils";

export function GateAccessManagement({
  logs,
  filters,
  total,
  page,
  limit,
}: {
  logs: GateAccessLogAdminRow[];
  filters: { q?: string; action?: string; apartment?: string };
  total: number;
  page: number;
  limit: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);

  function handleSync() {
    setSyncing(true);
    startTransition(async () => {
      const result = await syncGateAccessAction();
      notifyActionResult(result, "Зогсоолын эрх шинэчлэгдлээ");
      if (result.status === "success") {
        router.refresh();
      }
      setSyncing(false);
    });
  }

  const busy = isPending || syncing;

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionToolbar
        tabs={<ParkingTabs active="gate-access" />}
        action={
          <AdminPrimaryAction type="button" onClick={handleSync} disabled={busy}>
            <RefreshCw className={cn("size-4", busy && "animate-spin")} />
            {busy ? "Шалгаж байна..." : "Эрх шинэчлэх"}
          </AdminPrimaryAction>
        }
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Зогсоолын түүх</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Нийт {total} бичлэг · 2 сар дараалан төлөгдөөгүй бол RFID эрх автоматаар хаагдана
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="grid gap-3 lg:grid-cols-4">
            <PaginationFormFields page={page} limit={limit} />
            <Input name="q" placeholder="Хайлт..." defaultValue={filters.q ?? ""} className="lg:col-span-2" />
            <select name="action" defaultValue={filters.action ?? ""} className={erpSelectClassName}>
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
                        <StatusBadge
                          label={gateActionLabel(log.action)}
                          tone={log.action === "DENIED" ? "rose" : "emerald"}
                        />
                      </td>
                      <td className="px-3 py-3 max-w-sm text-xs text-zinc-600 dark:text-zinc-400">
                        {log.reason ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-500">{log.triggered_by ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination total={total} page={page} limit={limit} />
        </CardContent>
      </Card>
    </div>
  );
}
