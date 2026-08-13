"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { PaymentAdminRow } from "@/lib/queries/payments";
import { recordPaymentAction, type PaymentActionState } from "@/app/admin/payments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  erpDialogClassName,
  erpDialogFooterClassName,
  erpDialogHeaderClassName,
  erpSelectClassName,
} from "@/components/ui/erp-dialog";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { formatMNT, paymentMethodLabel, paymentRecordStatusLabel } from "@/lib/admin/format";
import { PaginationFormFields, TablePagination } from "@/components/admin/TablePagination";
import { FinanceTabs } from "@/components/admin/FinanceTabs";
import { AdminPrimaryAction, AdminSectionToolbar } from "@/components/admin/AdminSectionToolbar";
import { formatDateTimeMn } from "@/lib/format/datetime";

const initialState: PaymentActionState = { status: "idle" };

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "QPAY",
  "SOCIALPAY",
  "CARD",
  "OTHER",
] as const;

type OpenInvoiceOption = {
  id: string;
  label: string;
  remaining_amount: number;
};

function PaymentFormDialog({
  onClose,
  openInvoices,
}: {
  onClose: () => void;
  openInvoices: OpenInvoiceOption[];
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(recordPaymentAction, initialState);
  const [selectedInvoice, setSelectedInvoice] = useState(openInvoices[0]?.id ?? "");
  const [amount, setAmount] = useState(() => String(openInvoices[0]?.remaining_amount ?? ""));

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useActionToast(state, {
    onSuccess: () => {
      router.refresh();
      onClose();
    },
    successMessage: "Төлбөр амжилттай бүртгэгдлээ",
  });

  return (
    <dialog
      ref={dialogRef}
      className={erpDialogClassName}
      onClose={onClose}
    >
      <form action={formAction} className="flex flex-col">
        <div className={erpDialogHeaderClassName}>
          <h3 className="text-lg font-semibold">Төлбөр бүртгэх</h3>
        </div>
        <div className="grid gap-4 px-5 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invoice_id">Нэхэмжлэл</Label>
            <select
              id="invoice_id"
              name="invoice_id"
              value={selectedInvoice}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedInvoice(id);
                const inv = openInvoices.find((item) => item.id === id);
                setAmount(String(inv?.remaining_amount ?? ""));
              }}
              required
              className={erpSelectClassName}
            >
              {openInvoices.length === 0 ? (
                <option value="">Нээлттэй нэхэмжлэл байхгүй</option>
              ) : (
                openInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.label}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Дүн</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="1"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment_method">Төлбөрийн хэлбэр</Label>
            <select
              id="payment_method"
              name="payment_method"
              defaultValue="CASH"
              className={erpSelectClassName}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="transaction_id">Гүйлгээний дугаар (заавал биш)</Label>
            <Input id="transaction_id" name="transaction_id" />
          </div>
        </div>
        <div className={erpDialogFooterClassName}>
          <Button type="button" variant="outline" onClick={onClose}>
            Болих
          </Button>
          <Button type="submit" disabled={pending || openInvoices.length === 0}>
            {pending ? "Бүртгэж байна..." : "Бүртгэх"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

type Filters = {
  q?: string;
  method?: string;
};

export function PaymentManagement({
  payments,
  openInvoices,
  filters,
  total,
  page,
  limit,
}: {
  payments: PaymentAdminRow[];
  openInvoices: OpenInvoiceOption[];
  filters: Filters;
  total: number;
  page: number;
  limit: number;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionToolbar
        tabs={<FinanceTabs active="payments" />}
        action={
          <AdminPrimaryAction onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Төлбөр бүртгэх
          </AdminPrimaryAction>
        }
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Төлбөр</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Нийт {total} төлбөр</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="grid gap-3 md:grid-cols-3">
            <PaginationFormFields page={page} limit={limit} />
            <Input name="q" placeholder="Хайлт..." defaultValue={filters.q ?? ""} />
            <select
              name="method"
              defaultValue={filters.method ?? ""}
              className={erpSelectClassName}
            >
              <option value="">Бүх хэлбэр</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabel(method)}
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
                  <th className="px-3 py-3">Огноо</th>
                  <th className="px-3 py-3">Орон сууц</th>
                  <th className="px-3 py-3">Нэхэмжлэл</th>
                  <th className="px-3 py-3">Дүн</th>
                  <th className="px-3 py-3">Хэлбэр</th>
                  <th className="px-3 py-3">Гүйлгээ</th>
                  <th className="px-3 py-3">Төлөв</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-zinc-500">
                      Төлбөр олдсонгүй
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-3">
                        {formatDateTimeMn(payment.paid_at)}
                      </td>
                      <td className="px-3 py-3">
                        {[payment.building_name, payment.apartment_number].join(" · ")}
                      </td>
                      <td className="px-3 py-3">{payment.invoice_number ?? "—"}</td>
                      <td className="px-3 py-3 tabular-nums">{formatMNT(payment.amount)}</td>
                      <td className="px-3 py-3">{paymentMethodLabel(payment.payment_method)}</td>
                      <td className="px-3 py-3">{payment.transaction_id ?? "—"}</td>
                      <td className="px-3 py-3">{paymentRecordStatusLabel(payment.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination total={total} page={page} limit={limit} />
        </CardContent>
      </Card>

      {dialogOpen ? (
        <PaymentFormDialog
          key="payment-form"
          onClose={() => setDialogOpen(false)}
          openInvoices={openInvoices}
        />
      ) : null}
    </div>
  );
}
