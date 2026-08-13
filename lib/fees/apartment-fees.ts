export type FeeBreakdown = {
  apartment_fee: number;
  parking_fee: number;
  water_fee: number;
  electricity_fee: number;
};

export type InvoiceFeeType = 'APARTMENT' | 'PARKING' | 'WATER' | 'ELECTRICITY' | 'COMMUNITY';

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

export const FEE_TYPE_TO_KEY: Record<Exclude<InvoiceFeeType, 'COMMUNITY'>, FeeBreakdownKey> = {
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
  COMMUNITY: 'COM',
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
  if (feeType === 'COMMUNITY') return 'Нийгмийн хувь нэмэр';
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

export function feeBreakdownAmount(fees: FeeBreakdown, feeType: InvoiceFeeType): number {
  if (feeType === 'COMMUNITY') return 0;
  return fees[FEE_TYPE_TO_KEY[feeType]];
}

export function feeAmountFromApartment(
  apartment: FeeBreakdown,
  feeType: InvoiceFeeType,
): number {
  return feeBreakdownAmount(apartment, feeType);
}

export function feeBreakdownFromInvoices(
  invoices: Array<{ fee_type: InvoiceFeeType; amount: number }>,
): FeeBreakdown {
  const fees = normalizeFeeBreakdown(null);
  for (const invoice of invoices) {
    if (invoice.fee_type === 'COMMUNITY') continue;
    fees[FEE_TYPE_TO_KEY[invoice.fee_type]] += Number(invoice.amount ?? 0);
  }
  return fees;
}

export function remainingFeeBreakdownFromInvoices(
  invoices: Array<{ fee_type: InvoiceFeeType; remaining_amount: number; status: string }>,
): FeeBreakdown {
  const fees = normalizeFeeBreakdown(null);
  for (const invoice of invoices) {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') continue;
    if (invoice.fee_type === 'COMMUNITY') continue;
    const remaining = Number(invoice.remaining_amount ?? 0);
    if (remaining <= 0) continue;
    fees[FEE_TYPE_TO_KEY[invoice.fee_type]] += remaining;
  }
  return fees;
}

export function feeBreakdownFromApartment(apartment: FeeBreakdown): FeeBreakdown {
  return normalizeFeeBreakdown(apartment);
}

export function sumRemainingForFeeTypes(fees: FeeBreakdown, feeTypes: InvoiceFeeType[]): number {
  return feeTypes.reduce((sum, feeType) => {
    if (feeType === 'COMMUNITY') return sum;
    return sum + fees[FEE_TYPE_TO_KEY[feeType]];
  }, 0);
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

export type MonthlyInvoiceGroup<T extends {
  billing_year: number;
  billing_month: number;
  fee_type: InvoiceFeeType;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  due_date?: string | null;
  created_at: string;
}> = {
  billing_year: number;
  billing_month: number;
  due_date: string | null;
  created_at: string;
  invoices: T[];
  totals: ReturnType<typeof aggregateInvoiceTotals>;
  fees: FeeBreakdown;
};

/** Нэг байрны нэг сарын бүх төлбөрийг (байр, зогсоол, ус, цахилгаан) нэгтгэнэ */
export function groupInvoicesByBillingMonth<T extends {
  billing_year: number;
  billing_month: number;
  fee_type: InvoiceFeeType;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  due_date?: string | null;
  created_at: string;
}>(invoices: T[]): MonthlyInvoiceGroup<T>[] {
  const map = new Map<string, T[]>();

  for (const invoice of invoices) {
    const key = `${invoice.billing_year}-${invoice.billing_month}`;
    const bucket = map.get(key) ?? [];
    bucket.push(invoice);
    map.set(key, bucket);
  }

  return Array.from(map.values())
    .map((groupInvoices) => {
      const first = groupInvoices[0];
      const due_date = groupInvoices.find((inv) => inv.due_date)?.due_date ?? null;
      const created_at = groupInvoices.reduce(
        (earliest, inv) => (inv.created_at < earliest ? inv.created_at : earliest),
        first.created_at,
      );

      return {
        billing_year: first.billing_year,
        billing_month: first.billing_month,
        due_date,
        created_at,
        invoices: [...groupInvoices].sort((a, b) => a.fee_type.localeCompare(b.fee_type)),
        totals: aggregateInvoiceTotals(groupInvoices),
        fees: feeBreakdownFromInvoices(groupInvoices),
      };
    })
    .sort((a, b) => {
      if (a.billing_year !== b.billing_year) return b.billing_year - a.billing_year;
      return b.billing_month - a.billing_month;
    });
}

export type ApartmentMonthlyInvoiceGroup<T extends {
  apartment_id: string;
  apartment_number: string;
  building_name: string;
  tower?: string | null;
  owner_name?: string | null;
  billing_year: number;
  billing_month: number;
  fee_type: InvoiceFeeType;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  due_date?: string | null;
  created_at: string;
}> = MonthlyInvoiceGroup<T> & {
  apartment_id: string;
  apartment_number: string;
  building_name: string;
  tower: string | null;
  owner_name: string | null;
};

/** Admin: орон сууц + сар бүрт байр, зогсоол, ус, цахилгааны нэхэмжлэлийг нэгтгэнэ */
export function groupInvoicesByApartmentMonth<T extends {
  apartment_id: string;
  apartment_number: string;
  building_name: string;
  tower?: string | null;
  owner_name?: string | null;
  billing_year: number;
  billing_month: number;
  fee_type: InvoiceFeeType;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  due_date?: string | null;
  created_at: string;
}>(invoices: T[]): ApartmentMonthlyInvoiceGroup<T>[] {
  const map = new Map<string, T[]>();

  for (const invoice of invoices) {
    const key = `${invoice.apartment_id}-${invoice.billing_year}-${invoice.billing_month}`;
    const bucket = map.get(key) ?? [];
    bucket.push(invoice);
    map.set(key, bucket);
  }

  return Array.from(map.values())
    .map((groupInvoices) => {
      const first = groupInvoices[0];
      const due_date = groupInvoices.find((inv) => inv.due_date)?.due_date ?? null;
      const created_at = groupInvoices.reduce(
        (earliest, inv) => (inv.created_at < earliest ? inv.created_at : earliest),
        first.created_at,
      );

      return {
        apartment_id: first.apartment_id,
        apartment_number: first.apartment_number,
        building_name: first.building_name,
        tower: first.tower ?? null,
        owner_name: first.owner_name ?? null,
        billing_year: first.billing_year,
        billing_month: first.billing_month,
        due_date,
        created_at,
        invoices: [...groupInvoices].sort((a, b) => a.fee_type.localeCompare(b.fee_type)),
        totals: aggregateInvoiceTotals(groupInvoices),
        fees: feeBreakdownFromInvoices(groupInvoices),
      };
    })
    .sort((a, b) => {
      if (a.billing_year !== b.billing_year) return b.billing_year - a.billing_year;
      if (a.billing_month !== b.billing_month) return b.billing_month - a.billing_month;
      return a.apartment_number.localeCompare(b.apartment_number, 'mn', { numeric: true });
    });
}
