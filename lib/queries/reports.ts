import 'server-only';

import { query, type DbClient } from '@/lib/db';

export interface ReportFilters {
  organizationId: string;
  dateFrom?: string;
  dateTo?: string;
  buildingId?: string;
  tower?: string;
  entrance?: string;
}

function buildApartmentFilter(filters: ReportFilters, alias = 'apt'): { sql: string; params: unknown[] } {
  const clauses: string[] = [`${alias}.organization_id = $1`];
  const params: unknown[] = [filters.organizationId];
  let idx = 2;

  if (filters.buildingId) {
    clauses.push(`${alias}.building_id = $${idx++}`);
    params.push(filters.buildingId);
  }
  if (filters.tower) {
    clauses.push(`${alias}.tower = $${idx++}`);
    params.push(filters.tower);
  }
  if (filters.entrance) {
    clauses.push(`${alias}.entrance = $${idx++}`);
    params.push(filters.entrance);
  }

  return { sql: clauses.join(' AND '), params };
}

export interface FinancialReport {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  paid_apartments: number;
  unpaid_apartments: number;
  overdue_invoices: number;
  monthly_income: Array<{ month: number; year: number; label: string; amount: number }>;
}

export async function getFinancialReport(
  filters: ReportFilters,
  client?: DbClient,
): Promise<FinancialReport> {
  const aptFilter = buildApartmentFilter(filters, 'a');
  const dateClause =
    filters.dateFrom && filters.dateTo
      ? `AND i.created_at >= $${aptFilter.params.length + 1}::date AND i.created_at <= $${aptFilter.params.length + 2}::date + INTERVAL '1 day'`
      : '';
  const dateParams =
    filters.dateFrom && filters.dateTo ? [filters.dateFrom, filters.dateTo] : [];

  const { rows } = await query<{
    total_invoiced: string;
    total_paid: string;
    total_outstanding: string;
    paid_apartments: string;
    unpaid_apartments: string;
    overdue_invoices: string;
  }>(
    `
      SELECT
        COALESCE(SUM(i.amount), 0)::text AS total_invoiced,
        COALESCE(SUM(i.paid_amount), 0)::text AS total_paid,
        COALESCE(SUM(i.remaining_amount), 0)::text AS total_outstanding,
        COUNT(DISTINCT i.apartment_id) FILTER (WHERE i.remaining_amount = 0 AND i.status = 'PAID')::text AS paid_apartments,
        COUNT(DISTINCT i.apartment_id) FILTER (WHERE i.remaining_amount > 0)::text AS unpaid_apartments,
        COUNT(*) FILTER (WHERE i.status = 'OVERDUE')::text AS overdue_invoices
      FROM invoices i
      JOIN apartments a ON a.id = i.apartment_id
     WHERE ${aptFilter.sql}
       ${dateClause}
    `,
    [...aptFilter.params, ...dateParams],
    client,
  );

  const year = new Date().getFullYear();

  const { rows: paidByMonth } = await query<{ month: number; amount: string }>(
    `
      SELECT EXTRACT(MONTH FROM p.paid_at)::int AS month,
             COALESCE(SUM(p.amount), 0)::text AS amount
        FROM payments p
        JOIN apartments a ON a.id = p.apartment_id
       WHERE ${aptFilter.sql}
         AND p.status = 'CONFIRMED'::pay_status
         AND EXTRACT(YEAR FROM p.paid_at) = $${aptFilter.params.length + 1}
       GROUP BY EXTRACT(MONTH FROM p.paid_at)
       ORDER BY month
    `,
    [...aptFilter.params, year],
    client,
  );

  const monthLabels = [
    '1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
    '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар',
  ];

  const monthly_income = paidByMonth.map((row) => ({
    month: row.month,
    year,
    label: monthLabels[row.month - 1] ?? `${row.month}-р сар`,
    amount: Number(row.amount),
  }));

  const r = rows[0];
  return {
    total_invoiced: Number(r?.total_invoiced ?? 0),
    total_paid: Number(r?.total_paid ?? 0),
    total_outstanding: Number(r?.total_outstanding ?? 0),
    paid_apartments: parseInt(r?.paid_apartments ?? '0', 10),
    unpaid_apartments: parseInt(r?.unpaid_apartments ?? '0', 10),
    overdue_invoices: parseInt(r?.overdue_invoices ?? '0', 10),
    monthly_income,
  };
}

export interface PaymentMethodReport {
  methods: Array<{ method: string; amount: number; count: number }>;
}

export async function getPaymentMethodReport(
  filters: ReportFilters,
  client?: DbClient,
): Promise<PaymentMethodReport> {
  const aptFilter = buildApartmentFilter(filters, 'a');
  const { rows } = await query<{ method: string; amount: string; count: string }>(
    `
      SELECT p.payment_method::text AS method,
             COALESCE(SUM(p.amount), 0)::text AS amount,
             COUNT(*)::text AS count
        FROM payments p
        JOIN apartments a ON a.id = p.apartment_id
       WHERE ${aptFilter.sql}
         AND p.status = 'CONFIRMED'::pay_status
       GROUP BY p.payment_method
       ORDER BY amount DESC
    `,
    aptFilter.params,
    client,
  );

  return {
    methods: rows.map((r) => ({
      method: r.method,
      amount: Number(r.amount),
      count: parseInt(r.count, 10),
    })),
  };
}

export interface VehicleReport {
  total: number;
  active: number;
  disabled: number;
  disabled_unpaid: number;
  disabled_manual: number;
}

export async function getVehicleReport(
  filters: ReportFilters,
  client?: DbClient,
): Promise<VehicleReport> {
  const aptFilter = buildApartmentFilter(filters, 'a');
  const { rows } = await query<{
    total: string;
    active: string;
    disabled: string;
    disabled_unpaid: string;
    disabled_manual: string;
  }>(
    `
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE v.active = TRUE AND v.gate_access = TRUE)::text AS active,
        COUNT(*) FILTER (WHERE v.gate_access = FALSE)::text AS disabled,
        COUNT(*) FILTER (
          WHERE v.gate_access = FALSE
            AND v.disabled_reason IS NOT NULL
            AND v.disabled_reason LIKE '%2 сар%'
        )::text AS disabled_unpaid,
        COUNT(*) FILTER (
          WHERE v.gate_access = FALSE
            AND (v.disabled_reason IS NULL OR v.disabled_reason NOT LIKE '%2 сар%')
        )::text AS disabled_manual
      FROM vehicles v
      JOIN apartments a ON a.id = v.apartment_id
     WHERE ${aptFilter.sql}
    `,
    aptFilter.params,
    client,
  );

  const r = rows[0];
  return {
    total: parseInt(r?.total ?? '0', 10),
    active: parseInt(r?.active ?? '0', 10),
    disabled: parseInt(r?.disabled ?? '0', 10),
    disabled_unpaid: parseInt(r?.disabled_unpaid ?? '0', 10),
    disabled_manual: parseInt(r?.disabled_manual ?? '0', 10),
  };
}

export interface MaintenanceReport {
  total: number;
  open: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  by_category: Array<{ category: string; count: number }>;
  avg_resolution_hours: number | null;
}

export async function getMaintenanceReport(
  filters: ReportFilters,
  client?: DbClient,
): Promise<MaintenanceReport> {
  const aptFilter = buildApartmentFilter(filters, 'a');
  const { rows } = await query<{
    total: string;
    open: string;
    in_progress: string;
    completed: string;
    cancelled: string;
    avg_hours: string | null;
  }>(
    `
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE mr.status = 'OPEN')::text AS open,
        COUNT(*) FILTER (WHERE mr.status = 'IN_PROGRESS')::text AS in_progress,
        COUNT(*) FILTER (WHERE mr.status = 'COMPLETED')::text AS completed,
        COUNT(*) FILTER (WHERE mr.status = 'CANCELLED')::text AS cancelled,
        AVG(EXTRACT(EPOCH FROM (mr.updated_at - mr.created_at)) / 3600)
          FILTER (WHERE mr.status = 'COMPLETED')::text AS avg_hours
      FROM maintenance_requests mr
      JOIN apartments a ON a.id = mr.apartment_id
     WHERE ${aptFilter.sql}
    `,
    aptFilter.params,
    client,
  );

  const { rows: catRows } = await query<{ category: string; count: string }>(
    `
      SELECT mr.category::text, COUNT(*)::text AS count
        FROM maintenance_requests mr
        JOIN apartments a ON a.id = mr.apartment_id
       WHERE ${aptFilter.sql}
       GROUP BY mr.category
       ORDER BY count DESC
    `,
    aptFilter.params,
    client,
  );

  const r = rows[0];
  return {
    total: parseInt(r?.total ?? '0', 10),
    open: parseInt(r?.open ?? '0', 10),
    in_progress: parseInt(r?.in_progress ?? '0', 10),
    completed: parseInt(r?.completed ?? '0', 10),
    cancelled: parseInt(r?.cancelled ?? '0', 10),
    by_category: catRows.map((c) => ({
      category: c.category,
      count: parseInt(c.count, 10),
    })),
    avg_resolution_hours: r?.avg_hours ? Number(r.avg_hours) : null,
  };
}

export interface ResidentReport {
  total: number;
  active: number;
  inactive: number;
  owners: number;
  tenants: number;
}

export async function getResidentReport(
  filters: ReportFilters,
  client?: DbClient,
): Promise<ResidentReport> {
  const { rows } = await query<{
    total: string;
    active: string;
    inactive: string;
    owners: string;
    tenants: string;
  }>(
    `
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE r.status = 'ACTIVE')::text AS active,
        COUNT(*) FILTER (WHERE r.status != 'ACTIVE')::text AS inactive,
        COUNT(*) FILTER (WHERE r.is_owner = TRUE)::text AS owners,
        COUNT(*) FILTER (WHERE r.is_owner = FALSE)::text AS tenants
      FROM residents r
     WHERE r.organization_id = $1
    `,
    [filters.organizationId],
    client,
  );

  const r = rows[0];
  return {
    total: parseInt(r?.total ?? '0', 10),
    active: parseInt(r?.active ?? '0', 10),
    inactive: parseInt(r?.inactive ?? '0', 10),
    owners: parseInt(r?.owners ?? '0', 10),
    tenants: parseInt(r?.tenants ?? '0', 10),
  };
}
