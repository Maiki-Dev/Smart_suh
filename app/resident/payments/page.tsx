import { requireRole } from '@/lib/permissions';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMNT, paymentMethodLabel, paymentRecordStatusLabel } from '@/lib/admin/format';
import { getResidentOverviewStats } from '@/lib/queries/dashboard';
import { getApartmentDebt, listInvoicesByApartment } from '@/lib/queries/invoices';
import { listPaymentsByApartment } from '@/lib/queries/payments';
import { remainingFeeBreakdownFromInvoices } from '@/lib/fees/apartment-fees';
import { syncWirePaymentIntent } from '@/lib/wiremn/sync-payment-intent';
import { MonthlyInvoiceList } from '@/components/resident/MonthlyInvoiceList';
import { ResidentPaymentPanel } from '@/components/resident/ResidentPaymentPanel';
import { WirePaymentReturnSync } from '@/components/resident/WirePaymentReturnSync';
import { formatDateTimeMn } from '@/lib/format/datetime';

export default async function ResidentPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; pi?: string }>;
}) {
  const ctx = await requireRole(['RESIDENT']);
  const params = await searchParams;
  const overview = await getResidentOverviewStats(ctx.user.organization_id, ctx.user.id);
  const aptId = overview.apartment?.id;

  let wireSyncStatus: 'applied' | 'already_recorded' | 'pending' | 'none' = 'none';

  if (params.source === 'wiremn' && params.pi?.trim() && aptId) {
    const sync = await syncWirePaymentIntent(params.pi.trim(), {
      expectedApartmentId: aptId,
      expectedUserId: ctx.user.id,
    });
    if (sync.status === 'applied') wireSyncStatus = 'applied';
    else if (sync.status === 'already_recorded') wireSyncStatus = 'already_recorded';
    else if (sync.status === 'pending') wireSyncStatus = 'pending';
  }

  const wireReturnFailed = params.source === 'wiremn' && params.status === 'failed';
  const wireReturnSuccess =
    params.source === 'wiremn' &&
    params.status === 'success' &&
    wireSyncStatus !== 'pending';

  let debt = 0;
  let invoicesRes = { data: [] as Awaited<ReturnType<typeof listInvoicesByApartment>>['data'], total: 0 };
  let paymentsRes = { data: [] as Awaited<ReturnType<typeof listPaymentsByApartment>>['data'], total: 0 };
  let remainingByFee = remainingFeeBreakdownFromInvoices([]);

  if (aptId) {
    [debt, invoicesRes, paymentsRes] = await Promise.all([
      getApartmentDebt(aptId),
      listInvoicesByApartment(aptId, { limit: 24 }),
      listPaymentsByApartment(aptId, { limit: 24 }),
    ]);
    remainingByFee = remainingFeeBreakdownFromInvoices(invoicesRes.data);
  }

  const apartmentLabel = overview.apartment
    ? [overview.apartment.tower, overview.apartment.apartment_number].filter(Boolean).join(' · ')
    : '—';

  return (
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={overview.unread_notifications}
        activeSegment="payments"
        pageTitle="Төлбөр"
        pageSubtitle="Нэхэмжлэл, төлбөрийн түүх, үлдэгдэл"
      >
        {wireSyncStatus === 'pending' && params.pi ? (
          <WirePaymentReturnSync paymentIntentId={params.pi} initialStatus="pending" />
        ) : null}

        {wireSyncStatus === 'applied' ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
            Төлбөр амжилттай бүртгэгдлээ. Доорх <strong>Төлбөрийн түүх</strong> болон үлдэгдэл шинэчлэгдсэн.
          </div>
        ) : null}

        {wireSyncStatus === 'already_recorded' ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
            Энэ төлбөр аль хэдийн бүртгэгдсэн байна.
          </div>
        ) : null}

        {wireReturnSuccess && wireSyncStatus === 'none' ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
            Wire.mn-ээр төлбөр амжилттай хийгдлээ. Webhook-оор системд бүртгэгдэхэд хэдэн секунд шаардагдаж болно.
          </div>
        ) : null}

        {wireReturnFailed ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
            Wire.mn төлбөр амжилтгүй боллоо. Дахин оролдоно уу эсвэл СӨХ-ийн админд холбогдоно уу.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          {!aptId ? (
            <Card>
              <CardHeader>
                <CardTitle>Төлбөр төлөх</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500">Орон сууц холбогдоогүй</p>
              </CardContent>
            </Card>
          ) : (
            <ResidentPaymentPanel
              totalDebt={debt}
              remainingByFee={remainingByFee}
              apartmentLabel={apartmentLabel}
            />
          )}

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Нэхэмжлэл</CardTitle>
              <p className="text-sm text-zinc-500">
                Нэг байрны сар бүрийн төлбөр — байр, зогсоол, ус, цахилгаан тусдаа
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
  );
}
