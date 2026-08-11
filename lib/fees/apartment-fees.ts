export type FeeBreakdown = {
  apartment_fee: number;
  parking_fee: number;
  water_fee: number;
  electricity_fee: number;
};

export type InvoiceFeeType = 'APARTMENT' | 'PARKING' | 'WATER' | 'ELECTRICITY';

export const INVOICE_FEE_TYPES: InvoiceFeeType[] = [
  'APARTMENT',
  'PARKING',
  'WATER',
  'ELECTRICITY',
];

export const FEE_BREAKDOWN_KEYS = [
  'apartment_fee',
  'parking_fee',
  'water_fee',
  'electricity_fee',
] as const satisfies readonly (keyof FeeBreakdown)[];

export type FeeBreakdownKey = (typeof FEE_BREAKDOWN_KEYS)[number];

export const FEE_TYPE_TO_KEY: Record<InvoiceFeeType, FeeBreakdownKey> = {
  APARTMENT: 'apartment_fee',
  PARKING: 'parking_fee',
  WATER: 'water_fee',
  ELECTRICITY: 'electricity_fee',
};

export const KEY_TO_FEE_TYPE: Record<FeeBreakdownKey, InvoiceFeeType> = {
  apartment_fee: 'APARTMENT',
  parking_fee: 'PARKING',
  water_fee: 'WATER',
  electricity_fee: 'ELECTRICITY',
};

export const FEE_TYPE_SUFFIX: Record<InvoiceFeeType, string> = {
  APARTMENT: 'APT',
  PARKING: 'PRK',
  WATER: 'WTR',
  ELECTRICITY: 'ELR',
};

export function sumFeeBreakdown(fees: FeeBreakdown): number {
  return (
    fees.apartment_fee + fees.parking_fee + fees.water_fee + fees.electricity_fee
  );
}

export function feeBreakdownLabel(key: FeeBreakdownKey): string {
  switch (key) {
    case 'apartment_fee':
      return 'Байрны төлбөр';
    case 'parking_fee':
      return 'Зогсоол';
    case 'water_fee':
      return 'Ус';
    case 'electricity_fee':
      return 'Цахилгаан';
  }
}

export function invoiceFeeTypeLabel(feeType: InvoiceFeeType): string {
  return feeBreakdownLabel(FEE_TYPE_TO_KEY[feeType]);
}

export function normalizeFeeBreakdown(input: Partial<FeeBreakdown> | null | undefined): FeeBreakdown {
  return {
    apartment_fee: Number(input?.apartment_fee ?? 0),
    parking_fee: Number(input?.parking_fee ?? 0),
    water_fee: Number(input?.water_fee ?? 0),
    electricity_fee: Number(input?.electricity_fee ?? 0),
  };
}

export function feeAmountFromApartment(
  apartment: FeeBreakdown,
  feeType: InvoiceFeeType,
): number {
  return Number(apartment[FEE_TYPE_TO_KEY[feeType]] ?? 0);
}

export function feeBreakdownFromInvoices(
  invoices: Array<{ fee_type: InvoiceFeeType; amount: number }>,
): FeeBreakdown {
  const fees = normalizeFeeBreakdown(null);
  for (const invoice of invoices) {
    fees[FEE_TYPE_TO_KEY[invoice.fee_type]] += Number(invoice.amount ?? 0);
  }
  return fees;
}

export function feeBreakdownFromApartment(apartment: FeeBreakdown): FeeBreakdown {
  return normalizeFeeBreakdown(apartment);
}

export function aggregateInvoiceTotals(
  invoices: Array<{ amount: number; paid_amount: number; remaining_amount: number; status: string }>,
) {
  const amount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const paid_amount = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount), 0);
  const remaining_amount = invoices.reduce((sum, inv) => sum + Number(inv.remaining_amount), 0);
  const status = invoices.some((inv) => inv.status === 'OVERDUE')
    ? 'OVERDUE'
    : invoices.some((inv) => inv.status === 'PARTIAL')
      ? 'PARTIAL'
      : invoices.some((inv) => inv.status === 'PENDING')
        ? 'PENDING'
        : invoices.length > 0 && invoices.every((inv) => inv.status === 'PAID')
          ? 'PAID'
          : 'PENDING';

  return { amount, paid_amount, remaining_amount, status };
}
