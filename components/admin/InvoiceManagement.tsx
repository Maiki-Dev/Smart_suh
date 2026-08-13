"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Ban, CalendarPlus } from "lucide-react";
import type { InvoiceAdminRow } from "@/lib/queries/invoices";
import type { ApartmentAdminRow } from "@/lib/queries/apartments";
import {
  cancelInvoiceAction,
  generateMonthlyInvoicesAction,
} from "@/app/admin/invoices/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, paymentStatusTone } from "@/components/admin/StatusBadge";
import { formatMNT, invoiceStatusLabel } from "@/lib/admin/format";
import { formatApartmentOptionLabel } from "@/lib/admin/apartment-label";
import { groupInvoicesByApartmentMonth } from "@/lib/fees/apartment-fees";
import { FeeBreakdownInline } from "@/components/resident/FeeBreakdownPanel";
import { notifyActionResult } from "@/lib/hooks/use-action-toast";
import { PaginationFormFields, TablePagination } from "@/components/admin/TablePagination";
import {
  formatBillingMonthMn,
  formatDateMn,
  formatDateOnlyMn,
} from "@/lib/format/datetime";

type Filters = {
  q?: string;
  status?: string;
  year?: string;
  month?: string;
  apartment?: string;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function InvoiceManagement({
  invoices,
  apartments,
  filters,
  total,
  page,
  limit,
}: {
  invoices: InvoiceAdminRow[];
  apartments: ApartmentAdminRow[];
  filters: Filters;
  total: number;
  page: number;
  limit: number;
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const groups = useMemo(() => groupInvoicesByApartmentMonth(invoices), [invoices]);

  async function handleCancelGroup(groupKey: string, invoiceIds: string[]) {
    setPendingKey(groupKey);
    for (const id of invoiceIds) {
      const result = await cancelInvoiceAction(id);
      if (result.status === "error") {
        notifyActionResult(result);
        setPendingKey(null);
        return;
      }
    }
    notifyActionResult({ status: "success", message: "Сарын нэхэмжлэл цуцлагдлаа" });
    router.refresh();
    setPendingKey(null);
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateMonthlyInvoicesAction();
      notifyActionResult(
        { status: result.status, message: result.summary ?? result.message },
        "Нэхэмжлэл амжилттай үүслээ",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Нэхэмжлэл</CardTitle>
            <p className="text-sm text-zinc-500 mt-1">
              {groups.length} сарын нэхэмжлэл · {total} мөр (байр, зогсоол, ус, цахилгаан)
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={isPending}>
            <CalendarPlus className="size-4" />
            {isPending ? "Үүсгэж байна..." : "Сарын нэхэмжлэл үүсгэх"}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="grid gap-3 lg:grid-cols-6">
            <PaginationFormFields page={page} limit={limit} />
            <Input name="q" placeholder="Хайлт..." defaultValue={filters.q ?? ""} className="lg:col-span-2" />
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Бүх төлөв</option>
              <option value="PENDING">Төлөгдөөгүй</option>
              <option value="PARTIAL">Хэсэгчлэн</option>
              <option value="PAID">Төлсөн</option>
              <option value="OVERDUE">Хугацаа хэтэрсэн</option>
              <option value="CANCELLED">Цуцлагдсан</option>
            </select>
            <Input name="year" type="number" placeholder="Жил" defaultValue={filters.year ?? ""} />
            <select
              name="month"
              defaultValue={filters.month ?? ""}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Сар</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              name="apartment"
              defaultValue={filters.apartment ?? ""}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Бүх орон сууц</option>
              {apartments.map((apt) => (
                <option key={apt.id} value={apt.id}>
                  {[apt.building_name, apt.apartment_number].join(" · ")}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Шүүх
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60">
                <tr>
                  <th className="px-3 py-3">Орон сууц</th>
                  <th className="px-3 py-3">Төлбөрийн сар</th>
                  <th className="px-3 py-3">Задаргаа</th>
                  <th className="px-3 py-3">Нийт</th>
                  <th className="px-3 py-3">Төлсөн</th>
                  <th className="px-3 py-3">Үлдэгдэл</th>
                  <th className="px-3 py-3">Эзэмшигч</th>
                  <th className="px-3 py-3">Төлөв</th>
                  <th className="px-3 py-3 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-zinc-500">
                      Нэхэмжлэл олдсонгүй
                    </td>
                  </tr>
                ) : (
                  groups.map((group) => {
                    const groupKey = `${group.apartment_id}-${group.billing_year}-${group.billing_month}`;
                    const cancellableIds = group.invoices
                      .filter((inv) => inv.status !== "CANCELLED" && inv.status !== "PAID")
                      .map((inv) => inv.id);

                    return (
                      <Fragment key={groupKey}>
                        <tr className="border-t border-zinc-100 dark:border-zinc-800 align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium">
                              {formatApartmentOptionLabel({
                                building_name: group.building_name,
                                tower: group.tower,
                                apartment_number: group.apartment_number,
                              })}
                            </div>
                            <div className="text-xs text-zinc-500">{group.building_name}</div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="font-medium">
                              {formatBillingMonthMn(group.billing_year, group.billing_month)}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500 space-y-0.5">
                              <div>Үүссэн: {formatDateMn(group.created_at)}</div>
                              {group.due_date ? (
                                <div>Төлөх: {formatDateOnlyMn(group.due_date)}</div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 min-w-[220px]">
                            <FeeBreakdownInline fees={group.fees} />
                          </td>
                          <td className="px-3 py-3 tabular-nums font-medium">
                            {formatMNT(group.totals.amount)}
                          </td>
                          <td className="px-3 py-3 tabular-nums">{formatMNT(group.totals.paid_amount)}</td>
                          <td className="px-3 py-3 tabular-nums">{formatMNT(group.totals.remaining_amount)}</td>
                          <td className="px-3 py-3">{group.owner_name ?? "—"}</td>
                          <td className="px-3 py-3">
                            <StatusBadge
                              label={invoiceStatusLabel(group.totals.status)}
                              tone={paymentStatusTone(group.totals.status)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-1">
                              <Link
                                href={`/admin/apartments/${group.apartment_id}`}
                                className="inline-flex size-7 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                title="Орон сууц харах"
                              >
                                <Eye className="size-4" />
                              </Link>
                              {cancellableIds.length > 0 ? (
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  disabled={pendingKey === groupKey}
                                  onClick={() => handleCancelGroup(groupKey, cancellableIds)}
                                  title="Сарын нэхэмжлэл цуцлах"
                                >
                                  <Ban className="size-4 text-rose-600" />
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })
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
