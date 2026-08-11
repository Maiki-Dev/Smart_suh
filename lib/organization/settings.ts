export type OrganizationSettings = {
  timezone: string;
  currency: string;
  language: string;
  gate_unpaid_months: number;
  invoice_due_days: number;
  visitor_default_hours: number;
};

export const DEFAULT_ORG_SETTINGS: OrganizationSettings = {
  timezone: 'Asia/Ulaanbaatar',
  currency: 'MNT',
  language: 'mn',
  gate_unpaid_months: 2,
  invoice_due_days: 15,
  visitor_default_hours: 24,
};

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Ulaanbaatar', label: 'Улаанбаатар (UTC+8)' },
  { value: 'Asia/Hovd', label: 'Ховд (UTC+7)' },
  { value: 'UTC', label: 'UTC' },
] as const;

export const CURRENCY_OPTIONS = [{ value: 'MNT', label: 'Төгрөг (₮)' }] as const;

export const LANGUAGE_OPTIONS = [{ value: 'mn', label: 'Монгол' }] as const;

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function parseOrganizationSettings(
  raw: Record<string, unknown> | null | undefined,
): OrganizationSettings {
  const source = raw ?? {};
  return {
    timezone:
      typeof source.timezone === 'string' && source.timezone.trim()
        ? source.timezone
        : DEFAULT_ORG_SETTINGS.timezone,
    currency:
      typeof source.currency === 'string' && source.currency.trim()
        ? source.currency
        : DEFAULT_ORG_SETTINGS.currency,
    language:
      typeof source.language === 'string' && source.language.trim()
        ? source.language
        : DEFAULT_ORG_SETTINGS.language,
    gate_unpaid_months: readNumber(
      source.gate_unpaid_months,
      DEFAULT_ORG_SETTINGS.gate_unpaid_months,
      1,
      12,
    ),
    invoice_due_days: readNumber(
      source.invoice_due_days,
      DEFAULT_ORG_SETTINGS.invoice_due_days,
      1,
      60,
    ),
    visitor_default_hours: readNumber(
      source.visitor_default_hours,
      DEFAULT_ORG_SETTINGS.visitor_default_hours,
      1,
      168,
    ),
  };
}

export function mergeOrganizationSettings(
  existing: Record<string, unknown> | null | undefined,
  patch: Partial<OrganizationSettings>,
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    ...parseOrganizationSettings({ ...(existing ?? {}), ...patch }),
  };
}

export function gateDisabledReasonForMonths(months: number): string {
  return `СӨХ-ийн төлбөр ${months} сар дараалан төлөгдөөгүй.`;
}
