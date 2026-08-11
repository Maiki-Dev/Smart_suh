"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { invoiceFeeTypeLabel } from "@/lib/fees/apartment-fees";
import { notifyActionResult } from "@/lib/hooks/use-action-toast";
import { PaginationFormFields, TablePagination } from "@/components/admin/TablePagination";
import {
  formatBillingMonthMn,
  formatDateOnlyDateTimeMn,
  formatDateTimeMn,
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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCancel(id: string) {
    setPendingId(id);
    const result = await cancelInvoiceAction(id);
    notifyActionResult(result);
    router.refresh();
    setPendingId(null);
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
            <p className="text-sm text-zinc-500 mt-1">Нийт {total} нэхэмжлэл</p>
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
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60">
                <tr>
                  <th className="px-3 py-3">Дугаар</th>
                  <th className="px-3 py-3">Орон сууц</th>
                  <th className="px-3 py-3">Огноо</th>
                  <th className="px-3 py-3">Төрөл</th>
                  <th className="px-3 py-3">Дүн</th>
                  <th className="px-3 py-3">Төлсөн</th>
                  <th className="px-3 py-3">Үлдэгдэл</th>
                  <th className="px-3 py-3">Эзэмшигч</th>
                  <th className="px-3 py-3">Төлөв</th>
                  <th className="px-3 py-3 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-zinc-500">
                      Нэхэмжлэл олдсонгүй
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-3 font-medium">{inv.invoice_number}</td>
                      <td className="px-3 py-3">
                        {[inv.building_name, inv.tower, inv.apartment_number].filter(Boolean).join(" · ")}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 tabular-nums">
                          <span>{formatBillingMonthMn(inv.billing_year, inv.billing_month)}</span>
                          <span className="text-xs text-zinc-500">{formatDateTimeMn(inv.created_at)}</span>
                          {inv.due_date ? (
                            <span className="text-xs text-zinc-500">
                              Төлөх: {formatDateOnlyDateTimeMn(inv.due_date)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">{invoiceFeeTypeLabel(inv.fee_type)}</td>
                      <td className="px-3 py-3 tabular-nums">{formatMNT(inv.amount)}</td>
                      <td className="px-3 py-3 tabular-nums">{formatMNT(inv.paid_amount)}</td>
                      <td className="px-3 py-3 tabular-nums">{formatMNT(inv.remaining_amount)}</td>
                      <td className="px-3 py-3">{inv.owner_name ?? "—"}</td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          label={invoiceStatusLabel(inv.status)}
                          tone={paymentStatusTone(inv.status)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/admin/invoices/${inv.id}`}
                            className="inline-flex size-7 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Eye className="size-4" />
                          </Link>
                          {inv.status !== "CANCELLED" && inv.status !== "PAID" ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={pendingId === inv.id}
                              onClick={() => handleCancel(inv.id)}
                            >
                              <Ban className="size-4 text-rose-600" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
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
