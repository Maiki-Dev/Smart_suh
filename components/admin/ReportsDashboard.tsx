"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Building } from "@/types";
import type {
  FinancialReport,
  PaymentMethodReport,
  VehicleReport,
  MaintenanceReport,
  ResidentReport,
} from "@/lib/queries/reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMNT, maintenanceCategoryLabel, paymentMethodLabel } from "@/lib/admin/format";
import { FinanceTabs } from "@/components/admin/FinanceTabs";
import { Download } from "lucide-react";

type Filters = {
  building?: string;
  tower?: string;
  dateFrom?: string;
  dateTo?: string;
};

function buildExportUrl(type: string, format: string, filters: Filters): string {
  const params = new URLSearchParams({ type, format });
  if (filters.building) params.set("building", filters.building);
  if (filters.tower) params.set("tower", filters.tower);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return `/api/admin/reports/export?${params.toString()}`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

export function ReportsDashboard({
  financial,
  paymentMethods,
  vehicles,
  maintenance,
  residents,
  buildings,
  towers,
  filters,
}: {
  financial: FinancialReport;
  paymentMethods: PaymentMethodReport;
  vehicles: VehicleReport;
  maintenance: MaintenanceReport;
  residents: ResidentReport;
  buildings: Building[];
  towers: string[];
  filters: Filters;
}) {
  const monthlyChartData = financial.monthly_income.map((m) => ({
    name: m.label,
    amount: m.amount,
  }));

  const paymentChartData = paymentMethods.methods.map((m) => ({
    name: paymentMethodLabel(m.method),
    amount: m.amount,
    count: m.count,
  }));

  return (
    <div className="flex flex-col gap-6">
      <FinanceTabs active="reports" />
      <Card>
        <CardHeader>
          <CardTitle>Шүүлт</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 lg:grid-cols-5">
            <select
              name="building"
              defaultValue={filters.building ?? ""}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Бүх барилга</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              name="tower"
              defaultValue={filters.tower ?? ""}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Бүх байр</option>
              {towers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Input
              name="dateFrom"
              type="date"
              defaultValue={filters.dateFrom ?? ""}
              placeholder="Эхлэх огноо"
            />
            <Input
              name="dateTo"
              type="date"
              defaultValue={filters.dateTo ?? ""}
              placeholder="Дуусах огноо"
            />
            <Button type="submit" variant="outline">
              Шүүх
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(["financial", "payment-methods", "vehicles", "maintenance", "residents"] as const).map(
          (type) => (
            <div key={type} className="flex gap-1">
              {(["csv", "excel", "pdf"] as const).map((format) => (
                <a
                  key={`${type}-${format}`}
                  href={buildExportUrl(type, format, filters)}
                  className="inline-flex"
                >
                  <Button size="sm" variant="outline">
                    <Download className="size-3.5" />
                    {type} {format.toUpperCase()}
                  </Button>
                </a>
              ))}
            </div>
          ),
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Нэхэмжлэсэн" value={formatMNT(financial.total_invoiced)} />
        <StatCard label="Төлсөн" value={formatMNT(financial.total_paid)} />
        <StatCard label="Үлдэгдэл" value={formatMNT(financial.total_outstanding)} />
        <StatCard label="Хугацаа хэтэрсэн" value={financial.overdue_invoices} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Сарын орлого</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {monthlyChartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">Өгөгдөл байхгүй</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => formatMNT(Number(value ?? 0))}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="amount" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Төлбөрийн хэлбэр</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {paymentChartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">Өгөгдөл байхгүй</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => formatMNT(Number(value ?? 0))}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="amount" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Машин</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Нийт" value={vehicles.total} />
            <Row label="Идэвхтэй" value={vehicles.active} />
            <Row label="Идэвхгүй" value={vehicles.disabled} />
            <Row label="Төлбөргүйгээс" value={vehicles.disabled_unpaid} />
            <Row label="Гараар идэвхгүй" value={vehicles.disabled_manual} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Засвар</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Нийт" value={maintenance.total} />
            <Row label="Нээлттэй" value={maintenance.open} />
            <Row label="Явцад" value={maintenance.in_progress} />
            <Row label="Дууссан" value={maintenance.completed} />
            <Row label="Цуцлагдсан" value={maintenance.cancelled} />
            {maintenance.avg_resolution_hours != null ? (
              <Row
                label="Дундаж шийдвэрлэлт (цаг)"
                value={maintenance.avg_resolution_hours.toFixed(1)}
              />
            ) : null}
            {maintenance.by_category.length > 0 ? (
              <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {maintenance.by_category.map((c) => (
                  <Row
                    key={c.category}
                    label={maintenanceCategoryLabel(c.category)}
                    value={c.count}
                  />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Оршин суугч</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Нийт" value={residents.total} />
            <Row label="Идэвхтэй" value={residents.active} />
            <Row label="Идэвхгүй" value={residents.inactive} />
            <Row label="Эзэмшигч" value={residents.owners} />
            <Row label="Түр оршин суугч" value={residents.tenants} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Төлбөрийн статистик</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Төлсөн орон сууц" value={financial.paid_apartments} />
          <Row label="Төлөөгүй орон сууц" value={financial.unpaid_apartments} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
