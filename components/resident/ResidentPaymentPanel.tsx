'use client';

import { useMemo, useState, useTransition } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Home as HomeIcon,
  Car as CarIcon,
  Droplets as DropletsIcon,
  Zap as ZapIcon,
  CreditCard,
  Check,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMNT } from '@/lib/admin/format';
import {
  FEE_TYPE_TO_KEY,
  INVOICE_FEE_TYPES,
  invoiceFeeTypeLabel,
  type FeeBreakdown,
} from '@/lib/fees/apartment-fees';
import { createResidentWirePaymentAction } from '@/app/resident/payments/actions';
import type { InvoiceFeeType } from '@/types';
import { cn } from '@/lib/utils';

const FEE_ICONS: Record<InvoiceFeeType, LucideIcon> = {
  APARTMENT: HomeIcon,
  PARKING: CarIcon,
  WATER: DropletsIcon,
  ELECTRICITY: ZapIcon,
};

export function ResidentPaymentPanel({
  totalDebt,
  remainingByFee,
  apartmentLabel,
}: {
  totalDebt: number;
  remainingByFee: FeeBreakdown;
  apartmentLabel: string;
}) {
  const [selected, setSelected] = useState<InvoiceFeeType[]>(() =>
    INVOICE_FEE_TYPES.filter(
      (feeType) => remainingByFee[FEE_TYPE_TO_KEY[feeType]] > 0,
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const options = useMemo(
    () =>
      INVOICE_FEE_TYPES.map((feeType) => ({
        feeType,
        label: invoiceFeeTypeLabel(feeType),
        amount: remainingByFee[FEE_TYPE_TO_KEY[feeType]],
        Icon: FEE_ICONS[feeType],
      })),
    [remainingByFee],
  );

  const selectable = options.filter((o) => o.amount > 0);
  const selectedTotal = useMemo(
    () =>
      selected.reduce(
        (sum, feeType) => sum + remainingByFee[FEE_TYPE_TO_KEY[feeType]],
        0,
      ),
    [selected, remainingByFee],
  );

  function toggleFee(feeType: InvoiceFeeType) {
    setError(null);
    setSelected((prev) =>
      prev.includes(feeType)
        ? prev.filter((t) => t !== feeType)
        : [...prev, feeType],
    );
  }

  function selectAll() {
    setError(null);
    setSelected(selectable.map((o) => o.feeType));
  }

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const result = await createResidentWirePaymentAction(selected);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      window.open(result.url, '_blank', 'noopener,noreferrer');
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Төлбөр төлөх</CardTitle>
        <p className="text-sm text-zinc-500">
          {apartmentLabel !== '—' ? `${apartmentLabel} · ` : ''}
          Төлөх төрлөө сонгоод Wire.mn-ээр төлнө
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
            Нийт үлдэгдэл
          </div>
          <div className="text-3xl font-semibold tabular-nums">{formatMNT(totalDebt)}</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Төлбөрийн төрөл</span>
            {selectable.length > 1 ? (
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                Бүгдийг сонгох
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {options.map(({ feeType, label, amount, Icon }) => {
              const isSelected = selected.includes(feeType);
              const disabled = amount <= 0;
              return (
                <button
                  key={feeType}
                  type="button"
                  disabled={disabled || pending}
                  onClick={() => toggleFee(feeType)}
                  className={cn(
                    'relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
                    disabled && 'opacity-45 cursor-not-allowed',
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500/30 dark:bg-emerald-950/30'
                      : 'border-border bg-muted/20 hover:border-zinc-300 dark:hover:border-zinc-600',
                  )}
                >
                  {isSelected ? (
                    <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                  <div className="flex size-9 items-center justify-center rounded-lg bg-background">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div
                      className={cn(
                        'text-sm tabular-nums',
                        amount > 0 ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400',
                      )}
                    >
                      {amount > 0 ? formatMNT(amount) : 'Төлсөн'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-zinc-600 dark:text-zinc-300">Сонгосон дүн</span>
          <span className="text-xl font-semibold tabular-nums">
            {formatMNT(selectedTotal)}
          </span>
        </div>

        <Button
          type="button"
          className="w-full"
          size="lg"
          disabled={pending || selectedTotal <= 0}
          onClick={handlePay}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CreditCard className="size-4" />
          )}
          {pending ? 'Бэлтгэж байна...' : 'Wire.mn-ээр төлөх'}
        </Button>

        {error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        ) : null}

        {selectedTotal > 0 && selectedTotal < totalDebt ? (
          <p className="text-xs text-zinc-500">
            Зөвхөн сонгосон төрлийн үлдэгдэл хасагдана. Бусад төлбөр хэвээр үлдэнэ.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
