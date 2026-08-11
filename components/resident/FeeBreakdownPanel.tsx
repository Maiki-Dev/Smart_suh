import type { LucideIcon } from 'lucide-react';
import {
  Home as HomeIcon,
  Car as CarIcon,
  Droplets as DropletsIcon,
  Zap as ZapIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FEE_BREAKDOWN_KEYS,
  feeBreakdownLabel,
  sumFeeBreakdown,
  type FeeBreakdown,
  type FeeBreakdownKey,
} from '@/lib/fees/apartment-fees';
import { formatMNT, invoiceStatusLabel } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

const FEE_ICONS: Record<FeeBreakdownKey, LucideIcon> = {
  apartment_fee: HomeIcon,
  parking_fee: CarIcon,
  water_fee: DropletsIcon,
  electricity_fee: ZapIcon,
};

function invoiceStatusTone(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
    case 'PARTIAL':
      return 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300';
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
    case 'OVERDUE':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
    default:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  }
}

export function FeeBreakdownPanel({
  fees,
  title = 'Сарын төлбөрүүд',
  description = 'Байр, зогсоол, ус, цахилгааны төлбөр тус тусдаа',
  invoiceStatus,
  paidAmount,
  remainingAmount,
  compact = false,
}: {
  fees: FeeBreakdown;
  title?: string;
  description?: string;
  invoiceStatus?: string;
  paidAmount?: number;
  remainingAmount?: number;
  compact?: boolean;
}) {
  const total = sumFeeBreakdown(fees);

  return (
    <Card>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className={cn('text-base', compact && 'text-sm')}>{title}</CardTitle>
            {!compact ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {invoiceStatus ? (
            <Badge className={cn('text-[11px]', invoiceStatusTone(invoiceStatus))}>
              {invoiceStatusLabel(invoiceStatus)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn('pt-0', compact && 'space-y-2')}>
        <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
          {FEE_BREAKDOWN_KEYS.map((key) => {
            const Icon = FEE_ICONS[key];
            const amount = fees[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">{feeBreakdownLabel(key)}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatMNT(amount)}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="text-sm font-medium">Нийт</span>
          <span className="text-lg font-semibold tabular-nums">{formatMNT(total)}</span>
        </div>

        {paidAmount !== undefined && remainingAmount !== undefined ? (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums">Төлсөн: {formatMNT(paidAmount)}</span>
            <span className={cn('tabular-nums', remainingAmount > 0 && 'text-rose-600 dark:text-rose-400')}>
              Үлдэгдэл: {formatMNT(remainingAmount)}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function FeeBreakdownInline({ fees }: { fees: FeeBreakdown }) {
  return (
    <div className="mt-2 grid gap-1.5 rounded-lg bg-muted/30 p-2.5 text-xs">
      {FEE_BREAKDOWN_KEYS.map((key) => (
        <div key={key} className="flex items-center justify-between gap-2 tabular-nums">
          <span className="text-muted-foreground">{feeBreakdownLabel(key)}</span>
          <span>{formatMNT(fees[key])}</span>
        </div>
      ))}
    </div>
  );
}
