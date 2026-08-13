import type { InvoiceFeeType } from '@/lib/fees/apartment-fees';
import {
  groupInvoicesByBillingMonth,
  type MonthlyInvoiceGroup,
} from '@/lib/fees/apartment-fees';
import { formatMNT, invoiceStatusLabel } from '@/lib/admin/format';
import { formatBillingMonthMn, formatDateMn, formatDateOnlyMn } from '@/lib/format/datetime';
import { StatusBadge, paymentStatusTone } from '@/components/admin/StatusBadge';
import { FeeBreakdownInline } from '@/components/resident/FeeBreakdownPanel';
import { cn } from '@/lib/utils';

type InvoiceRow = {
  billing_year: number;
  billing_month: number;
  fee_type: InvoiceFeeType;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  due_date?: string | null;
  created_at: string;
};

export function MonthlyInvoiceList({
  invoices,
  emptyMessage = 'Нэхэмжлэл байхгүй',
  className,
}: {
  invoices: InvoiceRow[];
  emptyMessage?: string;
  className?: string;
}) {
  const groups = groupInvoicesByBillingMonth(invoices);

  if (groups.length === 0) {
    return <p className="py-6 text-center text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div className={cn('flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800', className)}>
      {groups.map((group) => (
        <MonthlyInvoiceGroupItem key={`${group.billing_year}-${group.billing_month}`} group={group} />
      ))}
    </div>
  );
}

function MonthlyInvoiceGroupItem({ group }: { group: MonthlyInvoiceGroup<InvoiceRow> }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium">
            {formatBillingMonthMn(group.billing_year, group.billing_month)}
          </div>
          <div className="mt-1 text-xs text-zinc-500 space-y-0.5">
            <div>Үүссэн: {formatDateMn(group.created_at)}</div>
            {group.due_date ? <div>Төлөх хугацаа: {formatDateOnlyMn(group.due_date)}</div> : null}
          </div>
        </div>
        <div className="text-right">
          <StatusBadge
            label={invoiceStatusLabel(group.totals.status)}
            tone={paymentStatusTone(group.totals.status)}
          />
          <div className="mt-2 text-lg font-semibold tabular-nums">{formatMNT(group.totals.amount)}</div>
          <div className="text-xs text-zinc-500 tabular-nums">
            Төлсөн {formatMNT(group.totals.paid_amount)} · Үлд {formatMNT(group.totals.remaining_amount)}
          </div>
        </div>
      </div>
      <FeeBreakdownInline fees={group.fees} />
    </div>
  );
}
