import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  StatusBadge,
  apartmentStatusTone,
  paymentStatusTone,
  residentStatusTone,
} from '@/components/admin/StatusBadge';
import {
  apartmentStatusLabel,
  formatMNT,
  invoiceStatusLabel,
  paymentMethodLabel,
  paymentRecordStatusLabel,
  paymentStatusLabel,
  residentStatusLabel,
} from '@/lib/admin/format';
import { getApartmentDetailBundle, getApartmentDeleteBlockers } from '@/lib/queries/apartments';
import { listResidentsByApartment } from '@/lib/queries/residents';
import { listInvoicesByApartment } from '@/lib/queries/invoices';
import { listPaymentsByApartment } from '@/lib/queries/payments';
import { listVehiclesByApartment } from '@/lib/queries/vehicles';
import { ArrowLeft } from 'lucide-react';
import { ApartmentDetailActions } from '@/components/admin/ApartmentDetailActions';

export default async function AdminApartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdminRole();
  const detail = await getApartmentDetailBundle(id);
  if (!detail) notFound();
  assertOrganizationAccess(ctx, detail.apartment.organization_id);

  const apartmentId = detail.apartment.id;
  const [residentsRes, invoicesRes, paymentsRes, vehiclesRes] = await Promise.all([
    listResidentsByApartment(apartmentId, { limit: 50 }),
    listInvoicesByApartment(apartmentId, { limit: 12 }),
    listPaymentsByApartment(apartmentId, { limit: 12 }),
    listVehiclesByApartment(apartmentId, { limit: 20 }),
  ]);

  const apt = detail.apartment;
  const apartmentLabel = [apt.tower, apt.apartment_number].filter(Boolean).join(' · ');
  const deleteBlockers = await getApartmentDeleteBlockers(apartmentId);
  const hasOwner = !!detail.owner || residentsRes.data.some((r) => r.is_owner);

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="apartments"
        pageTitle={apartmentLabel || apt.apartment_number}
        pageSubtitle={`${apt.building_name} — орон сууцны дэлгэрэнгүй`}
        headerRight={
          <Link
            href="/admin/apartments"
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
              <CardTitle>Орон сууцны мэдээлэл</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Info label="Барилга" value={apt.building_name} />
              <Info label="Байр" value={apt.tower ?? '—'} />
              <Info label="Орц" value={apt.entrance ?? '—'} />
              <Info label="Давхар" value={apt.floor?.toString() ?? '—'} />
              <Info label="Тоот" value={apt.apartment_number} />
              <Info label="Сарын төлбөр" value={formatMNT(apt.monthly_fee)} />
              <Info
                label="Эзэмшигч"
                value={
                  detail.owner
                    ? `${detail.owner.last_name} ${detail.owner.first_name}`
                    : '—'
                }
              />
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider text-zinc-500">Төлөв</span>
                <StatusBadge
                  label={apartmentStatusLabel(apt.status)}
                  tone={apartmentStatusTone(apt.status)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider text-zinc-500">Төлбөрийн төлөв</span>
                <StatusBadge
                  label={paymentStatusLabel(detail.payment_status)}
                  tone={paymentStatusTone(detail.payment_status)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Одоогийн өр</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{formatMNT(detail.current_debt)}</div>
              <p className="text-sm text-zinc-500 mt-2">Нээлттэй нэхэмжлэлийн үлдэгдэл</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mt-6 lg:grid-cols-2">
          <SectionCard title="Оршин суугчид" count={residentsRes.total}>
            {residentsRes.data.length === 0 ? (
              <EmptyText text="Оршин суугч байхгүй" />
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {residentsRes.data.map((resident) => (
                  <div key={resident.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-medium">
                        {resident.last_name} {resident.first_name}
                        {resident.is_owner ? (
                          <Badge className="ml-2 text-[10px]">Эзэмшигч</Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {[resident.phone, resident.email].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <StatusBadge
                      label={residentStatusLabel(resident.status)}
                      tone={residentStatusTone(resident.status)}
                    />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Машин" count={vehiclesRes.total}>
            {vehiclesRes.data.length === 0 ? (
              <EmptyText text="Машин бүртгэлгүй" />
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {vehiclesRes.data.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-medium tabular-nums">{vehicle.plate_number}</div>
                      <div className="text-xs text-zinc-500">
                        {vehicle.vehicle_type}
                        {vehicle.owner_name ? ` · ${vehicle.owner_name}` : ''}
                      </div>
                    </div>
                    <StatusBadge
                      label={vehicle.active && vehicle.gate_access ? 'Идэвхтэй' : 'Идэвхгүй'}
                      tone={vehicle.active && vehicle.gate_access ? 'emerald' : 'zinc'}
                    />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-6 mt-6 lg:grid-cols-2">
          <SectionCard title="Нэхэмжлэл" count={invoicesRes.total}>
            {invoicesRes.data.length === 0 ? (
              <EmptyText text="Нэхэмжлэл байхгүй" />
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {invoicesRes.data.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-medium">{invoice.invoice_number}</div>
                      <div className="text-xs text-zinc-500">
                        {invoice.billing_year}/{invoice.billing_month} · {invoiceStatusLabel(invoice.status)}
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div>{formatMNT(invoice.amount)}</div>
                      <div className="text-xs text-zinc-500">
                        Үлдэгдэл {formatMNT(invoice.remaining_amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Төлбөр" count={paymentsRes.total}>
            {paymentsRes.data.length === 0 ? (
              <EmptyText text="Төлбөр байхгүй" />
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
          </SectionCard>
        </div>

        <ApartmentDetailActions
          apartmentId={apartmentId}
          hasOwner={hasOwner}
          canDelete={deleteBlockers.length === 0}
          deleteBlockers={deleteBlockers}
        />
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

function SectionCard({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <span className="text-xs text-zinc-500">{count}</span>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-zinc-500">{text}</p>;
}
