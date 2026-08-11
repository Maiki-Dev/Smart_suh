import { requireRole } from '@/lib/permissions';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, paymentStatusTone } from '@/components/admin/StatusBadge';
import { formatMNT, invoiceStatusLabel, paymentMethodLabel, paymentRecordStatusLabel } from '@/lib/admin/format';
import { getResidentOverviewStats } from '@/lib/queries/dashboard';
import { getApartmentDebt } from '@/lib/queries/invoices';
import { listInvoicesByApartment } from '@/lib/queries/invoices';
import { listPaymentsByApartment } from '@/lib/queries/payments';

export default async function ResidentPaymentsPage() {
  const ctx = await requireRole(['RESIDENT']);
  const overview = await getResidentOverviewStats(ctx.user.organization_id, ctx.user.id);
  const aptId = overview.apartment?.id;

  let debt = 0;
  let invoicesRes = { data: [] as Awaited<ReturnType<typeof listInvoicesByApartment>>['data'], total: 0 };
  let paymentsRes = { data: [] as Awaited<ReturnType<typeof listPaymentsByApartment>>['data'], total: 0 };

  if (aptId) {
    [debt, invoicesRes, paymentsRes] = await Promise.all([
      getApartmentDebt(aptId),
      listInvoicesByApartment(aptId, { limit: 24 }),
      listPaymentsByApartment(aptId, { limit: 24 }),
    ]);
  }

  const apartmentLabel = overview.apartment
    ? [overview.apartment.tower, overview.apartment.apartment_number].filter(Boolean).join(' · ')
    : '—';

  return (
    <>
      <ThemeInitScript />
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={overview.unread_notifications}
        activeSegment="payments"
        pageTitle="Төлбөр"
        pageSubtitle="Нэхэмжлэл, төлбөрийн түүх, үлдэгдэл"
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Одоогийн төлбөр</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{formatMNT(debt)}</div>
              <p className="text-sm text-zinc-500 mt-2">Нээлттэй нэхэмжлэлийн үлдэгдэл</p>
            </CardContent>
          </Card>

          {overview.current_month_invoice ? (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Энэ сарын нэхэмжлэл</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatMNT(overview.current_month_invoice.amount)}
                  </div>
                  <div className="text-sm text-zinc-500 mt-1">
                    Төлсөн {formatMNT(overview.current_month_invoice.paid_amount)} · Үлд{' '}
                    {formatMNT(overview.current_month_invoice.remaining_amount)}
                  </div>
                </div>
                <StatusBadge
                  label={invoiceStatusLabel(overview.current_month_invoice.status)}
                  tone={paymentStatusTone(overview.current_month_invoice.status)}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="grid gap-6 mt-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Нэхэмжлэл</CardTitle>
            </CardHeader>
            <CardContent>
              {!aptId || invoicesRes.data.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">Нэхэмжлэл байхгүй</p>
              ) : (
                <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                  {invoicesRes.data.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <div className="font-medium">{invoice.invoice_number}</div>
                        <div className="text-xs text-zinc-500">
                          {invoice.billing_year}/{invoice.billing_month} · {formatMNT(invoice.amount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge
                          label={invoiceStatusLabel(invoice.status)}
                          tone={paymentStatusTone(invoice.status)}
                        />
                        <div className="text-xs text-zinc-500 mt-1 tabular-nums">
                          Үлд {formatMNT(invoice.remaining_amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Төлбөрийн түүх</CardTitle>
            </CardHeader>
            <CardContent>
              {!aptId || paymentsRes.data.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">Төлбөр байхгүй</p>
              ) : (
                <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                  {paymentsRes.data.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <div className="font-medium tabular-nums">{formatMNT(payment.amount)}</div>
                        <div className="text-xs text-zinc-500">
                          {paymentMethodLabel(payment.payment_method)} · {paymentRecordStatusLabel(payment.status)}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(payment.paid_at).toLocaleDateString('mn-MN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ResidentShell>
    </>
  );
}
