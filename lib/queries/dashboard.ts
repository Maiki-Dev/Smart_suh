import 'server-only';
import type { InvoiceStatus, InvoiceFeeType } from '@/types';
import { query, type DbClient } from '@/lib/db';

export interface AdminOverviewStats {
  total_apartments: number;
  total_residents: number;
  monthly_income: number;
  total_debt: number;
  active_vehicles: number;
  disabled_vehicles: number;
  open_maintenance: number;
  overdue_invoices: number;
  pending_invoices: number;
}

export async function getAdminOverviewStats(
  organizationId: string,
  client?: DbClient,
): Promise<AdminOverviewStats> {
  const { rows } = await query<AdminOverviewStats>(
    `
      WITH apt_counts AS (
        SELECT COUNT(*)::int AS total_apartments
          FROM apartments WHERE organization_id = $1
      ),
      res_counts AS (
        SELECT COUNT(*)::int AS total_residents
          FROM residents WHERE organization_id = $1 AND status = 'ACTIVE'
      ),
      inv_stats AS (
        SELECT
          COALESCE(SUM(paid_amount), 0)::numeric(18,2) AS monthly_income,
          COALESCE(SUM(remaining_amount), 0)::numeric(18,2) AS total_debt,
          COUNT(*) FILTER (WHERE status = 'OVERDUE')::int AS overdue_invoices,
          COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_invoices
        FROM invoices
        WHERE organization_id = $1
      ),
      veh_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE active = TRUE)::int AS active_vehicles,
          COUNT(*) FILTER (WHERE active = FALSE)::int AS disabled_vehicles
        FROM vehicles
        WHERE organization_id = $1
      ),
      maint_counts AS (
        SELECT COUNT(*)::int AS open_maintenance
          FROM maintenance_requests
         WHERE organization_id = $1
           AND status IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD')
      )
      SELECT
        a.total_apartments,
        r.total_residents,
        ROUND(COALESCE(i.monthly_income, 0))::bigint::int AS monthly_income,
        ROUND(COALESCE(i.total_debt, 0))::bigint::int AS total_debt,
        COALESCE(v.active_vehicles, 0) AS active_vehicles,
        COALESCE(v.disabled_vehicles, 0) AS disabled_vehicles,
        COALESCE(m.open_maintenance, 0) AS open_maintenance,
        COALESCE(i.overdue_invoices, 0) AS overdue_invoices,
        COALESCE(i.pending_invoices, 0) AS pending_invoices
      FROM apt_counts a
      CROSS JOIN res_counts r
      CROSS JOIN inv_stats i
      CROSS JOIN veh_stats v
      CROSS JOIN maint_counts m
    `,
    [organizationId],
    client,
  );
  return rows[0] ?? {
    total_apartments: 0,
    total_residents: 0,
    monthly_income: 0,
    total_debt: 0,
    active_vehicles: 0,
    disabled_vehicles: 0,
    open_maintenance: 0,
    overdue_invoices: 0,
    pending_invoices: 0,
  };
}

export interface AdminRecentActivity {
  id: string;
  kind: 'payment' | 'maintenance' | 'gate' | 'invoice';
  title: string;
  subtitle: string | null;
  created_at: string;
  amount?: number | null;
}

export async function getAdminRecentActivity(
  organizationId: string,
  limit: number = 10,
  client?: DbClient,
): Promise<AdminRecentActivity[]> {
  const { rows } = await query<AdminRecentActivity>(
    `
      WITH combined AS (
        SELECT
          id,
          'payment'::text AS kind,
          'Төлбөр хүлээн авсан' AS title,
          CONCAT(payment_method, ' — ', amount::text, '₮') AS subtitle,
          paid_at AS created_at,
          amount
        FROM payments
        WHERE organization_id = $1

        UNION ALL

        SELECT
          id,
          'maintenance'::text AS kind,
          title,
          CONCAT(priority, ' · ', status) AS subtitle,
          created_at,
          NULL
        FROM maintenance_requests
        WHERE organization_id = $1

        UNION ALL

        SELECT
          id,
          'gate'::text AS kind,
          CONCAT(action, ' — зогсоол') AS title,
          COALESCE(triggered_by, reason) AS subtitle,
          created_at,
          NULL
        FROM gate_access_logs
        WHERE organization_id = $1

        UNION ALL

        SELECT
          id,
          'invoice'::text AS kind,
          CONCAT(invoice_number, ' — ', billing_year, '·', LPAD(billing_month::text,2,'0')) AS title,
          CONCAT(status, ' · үлд: ', remaining_amount::text, '₮') AS subtitle,
          created_at,
          amount
        FROM invoices
        WHERE organization_id = $1
      )
      SELECT c.id, c.kind::"varchar", c.title, c.subtitle, c.created_at, c.amount
        FROM combined c
       ORDER BY c.created_at DESC
       LIMIT $2
    `,
    [organizationId, limit],
    client,
  );
  return rows;
}

export interface ResidentOverviewStats {
  apartment: {
    id: string;
    apartment_number: string;
    tower: string | null;
    entrance: string | null;
    floor: number | null;
    area_m2: number | null;
    monthly_fee: number;
    apartment_fee: number;
    parking_fee: number;
    water_fee: number;
    electricity_fee: number;
    status: string;
    building_name: string | null;
  } | null;
  current_month_invoices: Array<{
    id: string;
    fee_type: InvoiceFeeType;
    amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: InvoiceStatus;
    due_date: string | null;
  }>;
  total_debt: number;
  vehicles: {
    id: string;
    plate_number: string;
    vehicle_type: string;
    active: boolean;
    gate_access: boolean;
    rfid_number: string | null;
  }[];
  active_visitor_passes: number;
  open_maintenance_requests: number;
  unread_notifications: number;
}

export async function getResidentOverviewStats(
  organizationId: string,
  userId: string,
  client?: DbClient,
): Promise<ResidentOverviewStats> {
  const { rows } = await query(
    `
      WITH user_apt AS (
        SELECT a.id, a.apartment_number, a.tower, a.entrance, a.floor, a.area_m2,
               a.monthly_fee, a.apartment_fee, a.parking_fee, a.water_fee, a.electricity_fee,
               a.status, b.name AS building_name
          FROM residents r
          JOIN apartments a ON r.apartment_id = a.id
          LEFT JOIN buildings b ON a.building_id = b.id
         WHERE r.organization_id = $1 AND r.user_id = $2 AND r.status = 'ACTIVE'
         LIMIT 1
      ),
      cur_year_month AS (
        SELECT EXTRACT(YEAR FROM NOW())::int AS yr, EXTRACT(MONTH FROM NOW())::int AS mn
      ),
      current_inv AS (
        SELECT COALESCE(json_agg(json_build_object(
                 'id', i.id,
                 'fee_type', i.fee_type,
                 'amount', i.amount,
                 'paid_amount', i.paid_amount,
                 'remaining_amount', i.remaining_amount,
                 'status', i.status,
                 'due_date', i.due_date
               ) ORDER BY i.fee_type), '[]'::json) AS invoices
          FROM invoices i
          JOIN user_apt ua ON i.apartment_id = ua.id
          CROSS JOIN cur_year_month cym
         WHERE i.organization_id = $1
           AND i.billing_year = cym.yr
           AND i.billing_month = cym.mn
      ),
      all_debt AS (
        SELECT COALESCE(SUM(i.remaining_amount), 0)::numeric(18,2) AS total_debt
          FROM invoices i
          JOIN user_apt ua ON i.apartment_id = ua.id
         WHERE i.organization_id = $1 AND i.remaining_amount > 0
      ),
      veh_list AS (
        SELECT json_agg(json_build_object(
                 'id', v.id,
                 'plate_number', v.plate_number,
                 'vehicle_type', v.vehicle_type,
                 'active', v.active,
                 'gate_access', v.gate_access,
                 'rfid_number', v.rfid_number
               ) ORDER BY v.plate_number) AS vehicles
          FROM vehicles v
          JOIN user_apt ua ON v.apartment_id = ua.id
         WHERE v.organization_id = $1
      ),
      pass_count AS (
        SELECT COUNT(*)::int AS active_visitor_passes
          FROM visitor_passes vp
          JOIN user_apt ua ON vp.apartment_id = ua.id
         WHERE vp.organization_id = $1
           AND vp.status = 'ACTIVE'
           AND vp.valid_until >= NOW()
      ),
      maint_count AS (
        SELECT COUNT(*)::int AS open_maintenance_requests
          FROM maintenance_requests mr
          JOIN user_apt ua ON mr.apartment_id = ua.id
         WHERE mr.organization_id = $1
           AND mr.status IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD')
      ),
      notif_count AS (
        SELECT COUNT(*)::int AS unread_notifications
          FROM notifications
         WHERE user_id = $2 AND organization_id = $1 AND is_read = FALSE
      )
      SELECT
        (SELECT to_jsonb(ua) FROM user_apt ua LIMIT 1) AS apartment,
        (SELECT invoices FROM current_inv) AS current_month_invoices,
        COALESCE(ROUND(ad.total_debt)::bigint::int, 0) AS total_debt,
        COALESCE(vl.vehicles, '[]'::json) AS vehicles,
        COALESCE(pc.active_visitor_passes, 0) AS active_visitor_passes,
        COALESCE(mc.open_maintenance_requests, 0) AS open_maintenance_requests,
        COALESCE(nc.unread_notifications, 0) AS unread_notifications
      FROM all_debt ad
      CROSS JOIN veh_list vl
      CROSS JOIN pass_count pc
      CROSS JOIN maint_count mc
      CROSS JOIN notif_count nc
    `,
    [organizationId, userId],
    client,
  );
  const row = rows[0];
  return {
    apartment: row?.apartment ?? null,
    current_month_invoices: row?.current_month_invoices ?? [],
    total_debt: Number(row?.total_debt ?? 0),
    vehicles: row?.vehicles ?? [],
    active_visitor_passes: Number(row?.active_visitor_passes ?? 0),
    open_maintenance_requests: Number(row?.open_maintenance_requests ?? 0),
    unread_notifications: Number(row?.unread_notifications ?? 0),
  };
}
