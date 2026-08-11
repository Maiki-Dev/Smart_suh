import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, paymentStatusTone } from '@/components/admin/StatusBadge';
import { formatMNT, invoiceStatusLabel, paymentMethodLabel } from '@/lib/admin/format';
import { getInvoiceById } from '@/lib/queries/invoices';
import { listPaymentsByInvoice } from '@/lib/queries/payments';
import { listApartmentsAdminView } from '@/lib/queries/apartments';
import { ArrowLeft } from 'lucide-react';

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdminRole();
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();
  assertOrganizationAccess(ctx, invoice.organization_id);

  const [paymentsRes, apartmentsRes] = await Promise.all([
    listPaymentsByInvoice(id, { limit: 50 }),
    listApartmentsAdminView(invoice.organization_id, { limit: 500 }),
  ]);

  const apt = apartmentsRes.data.find((a) => a.id === invoice.apartment_id);

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="invoices"
        pageTitle={invoice.invoice_number}
        pageSubtitle="Нэхэмжлэлийн дэлгэрэнгүй"
        headerRight={
          <Link
            href="/admin/invoices"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="size-4" />
            Буцах
          </Link>
        }
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Нэхэмжлэл</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Info label="Дугаар" value={invoice.invoice_number} />
              <Info
                label="Орон сууц"
                value={
                  apt
                    ? [apt.building_name, apt.tower, apt.apartment_number].filter(Boolean).join(' · ')
                    : '—'
                }
              />
              <Info
                label="Сар"
                value={`${invoice.billing_year}/${String(invoice.billing_month).padStart(2, '0')}`}
              />
              <Info label="Дүн" value={formatMNT(invoice.amount)} />
              <Info label="Төлсөн" value={formatMNT(invoice.paid_amount)} />
              <Info label="Үлдэгдэл" value={formatMNT(invoice.remaining_amount)} />
              <Info
                label="Төлөгдөх огноо"
                value={invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('mn-MN') : '—'}
              />
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider text-zinc-500">Төлөв</span>
                <StatusBadge
                  label={invoiceStatusLabel(invoice.status)}
                  tone={paymentStatusTone(invoice.status)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Төлбөрийн түүх</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsRes.data.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">Төлбөр бүртгэгдээгүй</p>
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {paymentsRes.data.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-medium tabular-nums">{formatMNT(payment.amount)}</div>
                      <div className="text-xs text-zinc-500">
                        {paymentMethodLabel(payment.payment_method)}
                        {payment.transaction_id ? ` · ${payment.transaction_id}` : ''}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(payment.paid_at).toLocaleString('mn-MN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </AdminShell>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
