"use client";

import Link from "next/link";
import type { MaintenanceAdminRow } from "@/lib/queries/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatDateMn } from "@/lib/format/datetime";
import { Eye } from "lucide-react";

type Filters = {
  q?: string;
  status?: string;
  priority?: string;
  category?: string;
};

export function MaintenanceManagement({
  requests,
  filters,
  total,
}: {
  requests: MaintenanceAdminRow[];
  filters: Filters;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Засварын хүсэлтүүд</CardTitle>
            <p className="text-sm text-zinc-500 mt-1">Нийт {total} хүсэлт</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="grid gap-3 lg:grid-cols-5">
            <Input
              name="q"
              placeholder="Хайлт..."
              defaultValue={filters.q ?? ""}
              className="lg:col-span-2"
            />
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Бүх төлөв</option>
              {MAINTENANCE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              name="priority"
              defaultValue={filters.priority ?? ""}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Бүх түвшин</option>
              {MAINTENANCE_PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              name="category"
              defaultValue={filters.category ?? ""}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Бүх ангилал</option>
              {MAINTENANCE_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" className="lg:col-start-5">
              Шүүх
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60">
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
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-zinc-500">
                      Засварын хүсэлт олдсонгүй
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-3 font-medium max-w-[200px] truncate">{req.title}</td>
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
                      <td className="px-3 py-3 text-zinc-500">
                        {formatDateMn(req.created_at)}
                      </td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
