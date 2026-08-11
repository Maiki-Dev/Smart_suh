"use client";

import Link from "next/link";
import type { MaintenanceAdminRow } from "@/lib/queries/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { erpSelectClassName } from "@/components/ui/erp-dialog";
import {
  StatusBadge,
  maintenancePriorityTone,
  maintenanceStatusTone,
} from "@/components/admin/StatusBadge";
import {
  MAINTENANCE_CATEGORY_OPTIONS,
  MAINTENANCE_PRIORITY_OPTIONS,
  MAINTENANCE_STATUS_OPTIONS,
  maintenanceCategoryLabel,
  maintenancePriorityLabel,
  maintenanceStatusLabel,
} from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";
import { Eye, Wrench, X } from "lucide-react";
import { PaginationFormFields, TablePagination } from "@/components/admin/TablePagination";

type Filters = {
  q?: string;
  status?: string;
  priority?: string;
  category?: string;
};

function hasActiveFilters(filters: Filters) {
  return !!(filters.q || filters.status || filters.priority || filters.category);
}

export function MaintenanceManagement({
  requests,
  filters,
  total,
  page,
  limit,
}: {
  requests: MaintenanceAdminRow[];
  filters: Filters;
  total: number;
  page: number;
  limit: number;
}) {
  const openCount = requests.filter((r) => ["OPEN", "IN_PROGRESS", "ON_HOLD"].includes(r.status)).length;
  const criticalCount = requests.filter((r) => r.priority === "CRITICAL" && r.status !== "COMPLETED" && r.status !== "CANCELLED").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Нийт хүсэлт" value={String(total)} />
        <SummaryCard label="Нээлттэй" value={String(openCount)} />
        <SummaryCard label="Яаралтай" value={String(criticalCount)} highlight={criticalCount > 0} />
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Засварын хүсэлтүүд</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Яаралтай хүсэлт эхэнд, дараа нь шинэ хүсэлтүүд
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="grid gap-3 lg:grid-cols-6">
            <PaginationFormFields page={page} limit={limit} />
            <Input
              name="q"
              placeholder="Хайлт..."
              defaultValue={filters.q ?? ""}
              className="lg:col-span-2"
            />
            <select name="status" defaultValue={filters.status ?? ""} className={erpSelectClassName}>
              <option value="">Бүх төлөв</option>
              {MAINTENANCE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select name="priority" defaultValue={filters.priority ?? ""} className={erpSelectClassName}>
              <option value="">Бүх түvшин</option>
              {MAINTENANCE_PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select name="category" defaultValue={filters.category ?? ""} className={erpSelectClassName}>
              <option value="">Бүх ангилал</option>
              {MAINTENANCE_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" className="flex-1">
                Шүүх
              </Button>
              {hasActiveFilters(filters) ? (
                <Link
                  href="/admin/maintenance"
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                  title="Шүүлт цэвэрлэх"
                >
                  <X className="size-4" />
                </Link>
              ) : null}
            </div>
          </form>

          {requests.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Засварын хүсэлт олдсонгүй"
              description={
                hasActiveFilters(filters)
                  ? "Шүүлтийн нөхцөл өөрчилж үзнэ үү."
                  : "Оршин суугch хүсэлт илгээхэд энд харагдана."
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/40 text-left text-[11px] font-medium text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">Гарчиг</th>
                    <th className="px-3 py-3">Орон сууц</th>
                    <th className="px-3 py-3">Ангилал</th>
                    <th className="px-3 py-3">Түвшин</th>
                    <th className="px-3 py-3">Төлөв</th>
                    <th className="px-3 py-3">Хариуцагч</th>
                    <th className="px-3 py-3">Огноо</th>
                    <th className="px-3 py-3 text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className={cn(
                        "border-t border-border transition-colors hover:bg-muted/30",
                        req.priority === "CRITICAL" && req.status !== "COMPLETED" && req.status !== "CANCELLED"
                          ? "bg-rose-50/40 dark:bg-rose-500/5"
                          : "",
                      )}
                    >
                      <td className="px-3 py-3 font-medium max-w-[220px]">
                        <Link href={`/admin/maintenance/${req.id}`} className="hover:underline line-clamp-1">
                          {req.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        {[req.building_name, req.tower, req.apartment_number].filter(Boolean).join(" · ")}
                      </td>
                      <td className="px-3 py-3">{maintenanceCategoryLabel(req.category)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          label={maintenancePriorityLabel(req.priority)}
                          tone={maintenancePriorityTone(req.priority)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          label={maintenanceStatusLabel(req.status)}
                          tone={maintenanceStatusTone(req.status)}
                        />
                      </td>
                      <td className="px-3 py-3">{req.assigned_operator_name ?? "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{formatDateTimeMn(req.created_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end">
                          <Link href={`/admin/maintenance/${req.id}`}>
                            <Button size="icon-sm" variant="ghost" title="Дэлгэрэнгүй">
                              <Eye className="size-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination total={total} page={page} limit={limit} />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums", highlight && "text-rose-600 dark:text-rose-400")}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
