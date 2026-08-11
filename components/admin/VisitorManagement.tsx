"use client";

import { useTransition } from "react";
import { Ban, CheckCircle2 } from "lucide-react";
import type { VisitorPassAdminRow } from "@/lib/queries/visitors";
import type { ApartmentAdminRow } from "@/lib/queries/apartments";
import { cancelVisitorPassAction, markVisitorUsedAction } from "@/app/admin/visitors/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { passStatusLabel } from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";

function passTone(status: string): "emerald" | "amber" | "rose" | "zinc" {
  switch (status) {
    case "ACTIVE":
      return "emerald";
    case "USED":
      return "zinc";
    case "EXPIRED":
      return "amber";
    case "CANCELLED":
      return "rose";
    default:
      return "zinc";
  }
}

export function VisitorManagement({
  passes,
  apartments,
  filters,
  total,
}: {
  passes: VisitorPassAdminRow[];
  apartments: ApartmentAdminRow[];
  filters: { q?: string; status?: string; apartment?: string; from?: string; to?: string };
  total: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Зочны эрхүүд</CardTitle>
        <p className="text-sm text-zinc-500 mt-1">Нийт {total} бичлэг</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form method="get" className="grid gap-3 lg:grid-cols-6">
          <Input name="q" placeholder="Хайлт..." defaultValue={filters.q ?? ""} className="lg:col-span-2" />
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">Бүх төлөв</option>
            <option value="ACTIVE">Идэвхтэй</option>
            <option value="USED">Ашигласан</option>
            <option value="EXPIRED">Хугацаа дууссан</option>
            <option value="CANCELLED">Цуцлагдсан</option>
          </select>
          <select
            name="apartment"
            defaultValue={filters.apartment ?? ""}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">Бүх орон сууц</option>
            {apartments.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {[apt.building_name, apt.apartment_number].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
          <Input name="from" type="datetime-local" defaultValue={filters.from ?? ""} />
          <Button type="submit" variant="outline">Шүүх</Button>
        </form>

        <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60">
              <tr>
                <th className="px-3 py-3">Зочин</th>
                <th className="px-3 py-3">Утас</th>
                <th className="px-3 py-3">Машин</th>
                <th className="px-3 py-3">Орон сууц</th>
                <th className="px-3 py-3">Оршин суугч</th>
                <th className="px-3 py-3">Эхлэх</th>
                <th className="px-3 py-3">Дуусах</th>
                <th className="px-3 py-3">Төлөв</th>
                <th className="px-3 py-3 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {passes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-zinc-500">Зочны эрх байхгүй</td>
                </tr>
              ) : (
                passes.map((pass) => (
                  <tr key={pass.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-3 py-3 font-medium">{pass.visitor_name}</td>
                    <td className="px-3 py-3">{pass.phone ?? "—"}</td>
                    <td className="px-3 py-3">{pass.plate_number ?? "—"}</td>
                    <td className="px-3 py-3">{[pass.building_name, pass.apartment_number].filter(Boolean).join(" · ")}</td>
                    <td className="px-3 py-3">{pass.resident_name ?? "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatDateTimeMn(pass.valid_from)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatDateTimeMn(pass.valid_until)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge label={passStatusLabel(pass.status)} tone={passTone(pass.status)} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      {pass.status === "ACTIVE" ? (
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => startTransition(async () => { await markVisitorUsedAction(pass.id); })}
                          >
                            <CheckCircle2 className="size-3.5 mr-1" /> Ашигласан
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => startTransition(async () => { await cancelVisitorPassAction(pass.id); })}
                          >
                            <Ban className="size-3.5 mr-1" /> Цуцлах
                          </Button>
                        </div>
                      ) : "—"}
                    </td>
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
