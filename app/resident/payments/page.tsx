import { requireRole } from '@/lib/permissions';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMNT, paymentMethodLabel, paymentRecordStatusLabel } from '@/lib/admin/format';
import { getResidentOverviewStats } from '@/lib/queries/dashboard';
import { getApartmentDebt, listInvoicesByApartment } from '@/lib/queries/invoices';
import { listPaymentsByApartment } from '@/lib/queries/payments';
import {
  feeBreakdownFromApartment,
  feeBreakdownFromInvoices,
  sumFeeBreakdown,
} from '@/lib/fees/apartment-fees';
import { MonthlyInvoiceList } from '@/components/resident/MonthlyInvoiceList';
import { formatDateTimeMn } from '@/lib/format/datetime';
import { resolvePaymentUrlAsync } from '@/lib/wiremn/service';
import { CreditCard } from 'lucide-react';

export default async function ResidentPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const ctx = await requireRole(['RESIDENT']);
  const params = await searchParams;
  const wireReturnStatus =
    params.source === 'wiremn' && params.status === 'success'
      ? 'success'
      : params.source === 'wiremn' && params.status === 'failed'
        ? 'failed'
        : null;
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

  const payRes = await resolvePaymentUrlAsync({
    fallbackAmount: debt > 0 ? debt : undefined,
    description: apartmentLabel
      ? `СӨХ төлбөр - ${apartmentLabel}`
      : 'СӨХ төлбөр',
    reference: aptId ? `apt:${aptId}` : undefined,
    apartmentId: aptId,
    residentUserId: ctx.user.id,
    successRedirectPath: '/resident/payments',
    failRedirectPath: '/resident/payments',
  });

  const currentMonthFees =
    overview.current_month_invoices.length > 0
      ? feeBreakdownFromInvoices(overview.current_month_invoices)
      : overview.apartment
        ? feeBreakdownFromApartment(overview.apartment)
        : null;

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
        {wireReturnStatus === 'success' ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
            Wire.mn-ээр төлбөр амжилттай хийгдлээ. Системд бүртгэгдэхэд хэдэн секунд шаардагдаж болно.
            Доорх <strong>Төлбөрийн түүх</strong> хэсэгт гарч ирнэ. Хэрэв үлдэгдэл хасагдахгүй бол СӨХ-ийн
            админд холбогдоно уу.
          </div>
        ) : null}
        {wireReturnStatus === 'failed' ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
            Wire.mn төлбөр амжилтгүй боллоо. Дахин оролдоно уу эсвэл СӨХ-ийн админд холбогдоно уу.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Одоогийн төлбөр</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{formatMNT(debt)}</div>
              <p className="text-sm text-zinc-500 mt-2">Нээлттэй нэхэмжлэлийн үлдэгдэл</p>
              {currentMonthFees ? (
                <p className="text-xs text-zinc-500 mt-1">
                  Энэ сарын нийт: {formatMNT(sumFeeBreakdown(currentMonthFees))}
                </p>
              ) : null}
              <a
                href={payRes.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <CreditCard className="size-4" />
                Төлбөр төлөх (Wire.mn)
              </a>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Нэхэмжлэл</CardTitle>
              <p className="text-sm text-zinc-500">
                Нэг байрны сар бүрийн төлбөр — байр, зогсоол, ус, цахилгаан нэгтгэгдсэн
              </p>
            </CardHeader>
            <CardContent>
              {!aptId ? (
                <p className="py-6 text-center text-sm text-zinc-500">Орон сууц холбогдоогүй</p>
              ) : (
                <MonthlyInvoiceList invoices={invoicesRes.data} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mt-6">
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
                          {payment.transaction_id ? (
                            <span className="block mt-0.5 font-mono text-[11px] text-zinc-400">
                              {payment.transaction_id}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 tabular-nums">
                        {formatDateTimeMn(payment.paid_at)}
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
