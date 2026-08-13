const TZ = 'Asia/Ulaanbaatar';

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

function readParts(date: Date, includeTime: boolean): Record<string, string> {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : {}),
  };

  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function formatDateMn(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';

  const parts = readParts(date, false);
  return `${parts.year}.${parts.month}.${parts.day}`;
}

export function formatDateTimeMn(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';

  const parts = readParts(date, true);
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

export function formatDateTimeLocalValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function defaultVisitorValidFrom(): string {
  return formatDateTimeLocalValue(new Date());
}

export function defaultVisitorValidUntil(): string {
  const end = new Date();
  end.setHours(end.getHours() + 24);
  return formatDateTimeLocalValue(end);
}

export function isPastInTimeZone(value: string | Date | null | undefined): boolean {
  const date = toDate(value);
  if (!date) return false;
  return date.getTime() < Date.now();
}

export function formatDateMnLong(value: string | Date | null | undefined): string {
  return formatDateMn(value);
}

/** Төлбөрийн сар — жишээ: "2026 оны 8 сар" */
export function formatBillingMonthMn(year: number, month: number): string {
  return `${year} оны ${month} сар`;
}

/** PostgreSQL DATE (YYYY-MM-DD) — цаггүй, timezone shiftгүй */
export function formatDateOnlyMn(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  return formatDateMn(value);
}

/** @deprecated formatDateOnlyMn ашиглана — DATE талбарт 00:00 харуулах шаардлагагүй */
export function formatDateOnlyDateTimeMn(value: string | null | undefined): string {
  return formatDateOnlyMn(value);
}
