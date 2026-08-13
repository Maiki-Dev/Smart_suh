import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type { Invoice, InvoiceFeeType, InvoiceStatus, PaginationOptions, ListResult } from '@/types';
import {
  FEE_TYPE_SUFFIX,
  INVOICE_FEE_TYPES,
  feeAmountFromApartment,
} from '@/lib/fees/apartment-fees';
import { createAuditLog } from '@/lib/queries/audit_logs';
import { createNotification } from '@/lib/queries/notifications';

const INVOICE_RETURNING = `
  id, organization_id, apartment_id, invoice_number,
  billing_year, billing_month, fee_type, amount,
  paid_amount, remaining_amount,
  due_date, status, community_proposal_id, created_at, updated_at
`;

export interface InvoiceAdminRow extends Invoice {
  apartment_number: string;
  building_name: string;
  tower: string | null;
  owner_name: string | null;
}

export interface GenerateMonthlyInvoicesResult {
  organization_id: string;
  billing_year: number;
  billing_month: number;
  created: number;
  skipped: number;
  zero_fee: number;
  errors: string[];
}

export function deriveInvoiceStatus(
  invoice: Pick<Invoice, 'amount' | 'paid_amount' | 'due_date' | 'status'>,
): InvoiceStatus {
  if (invoice.status === 'CANCELLED') return 'CANCELLED';
  if (invoice.paid_amount >= invoice.amount) return 'PAID';
  const today = new Date().toISOString().slice(0, 10);
  if (invoice.due_date && invoice.due_date < today && invoice.paid_amount < invoice.amount) {
    return 'OVERDUE';
  }
  if (invoice.paid_amount > 0) return 'PARTIAL';
  return 'PENDING';
}

export async function syncInvoiceStatus(
  invoiceId: string,
  client?: DbClient,
): Promise<Invoice | null> {
  const invoice = await getInvoiceById(invoiceId, client);
  if (!invoice || invoice.status === 'CANCELLED') return invoice;

  const nextStatus = deriveInvoiceStatus(invoice);
  if (nextStatus === invoice.status) return invoice;

  const { rows } = await query<Invoice>(
    `
      UPDATE invoices
         SET status = $1::inv_status
       WHERE id = $2
       RETURNING ${INVOICE_RETURNING}
    `,
    [nextStatus, invoiceId],
    client,
  );
  return rows[0] ?? null;
}

export async function getApartmentDebt(
  apartmentId: string,
  client?: DbClient,
): Promise<number> {
  const { rows } = await query<{ total: string }>(
    `
      SELECT COALESCE(SUM(remaining_amount), 0)::text AS total
        FROM invoices
       WHERE apartment_id = $1
         AND status NOT IN ('PAID', 'CANCELLED')
    `,
    [apartmentId],
    client,
  );
  return parseFloat(rows[0]?.total ?? '0');
}

export async function syncOverdueInvoices(
  organizationId: string,
  client?: DbClient,
): Promise<number> {
  const { rowCount } = await query(
    `
      UPDATE invoices
         SET status = 'OVERDUE'::inv_status
       WHERE organization_id = $1
         AND status IN ('PENDING', 'PARTIAL')
         AND due_date IS NOT NULL
         AND due_date < CURRENT_DATE
         AND paid_amount < amount
    `,
    [organizationId],
    client,
  );
  return rowCount ?? 0;
}

async function nextInvoiceNumber(
  organizationId: string,
  year: number,
  month: number,
  feeType: InvoiceFeeType,
  client?: DbClient,
): Promise<string> {
  const { rows } = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
        FROM invoices
       WHERE organization_id = $1
         AND billing_year = $2
         AND billing_month = $3
    `,
    [organizationId, year, month],
    client,
  );
  const seq = String(parseInt(rows[0]?.count ?? '0', 10) + 1).padStart(4, '0');
  return `INV-${year}-${String(month).padStart(2, '0')}-${seq}-${FEE_TYPE_SUFFIX[feeType]}`;
}

function defaultDueDate(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-10`;
}

async function notifyApartmentResidents(
  organizationId: string,
  apartmentId: string,
  title: string,
  message: string,
  type: 'INVOICE' | 'PAYMENT',
  client?: DbClient,
): Promise<void> {
  const { rows } = await query<{ user_id: string }>(
    `
      SELECT user_id
        FROM residents
       WHERE apartment_id = $1
         AND status = 'ACTIVE'
         AND user_id IS NOT NULL
    `,
    [apartmentId],
    client,
  );

  for (const row of rows) {
    await createNotification({
      organization_id: organizationId,
      user_id: row.user_id,
      type,
      title,
      message,
      client,
    });
  }
}

export async function generateMonthlyInvoices(input?: {
  organizationId?: string;
  year?: number;
  month?: number;
  client?: DbClient;
}): Promise<GenerateMonthlyInvoicesResult[]> {
  const now = new Date();
  const billingYear = input?.year ?? now.getFullYear();
  const billingMonth = input?.month ?? now.getMonth() + 1;

  const orgFilter = input?.organizationId
    ? 'WHERE id = $1'
    : '';
  const orgParams = input?.organizationId ? [input.organizationId] : [];

  const { rows: orgs } = await query<{ id: string; name: string }>(
    `SELECT id, name FROM organizations ${orgFilter} ORDER BY name ASC`,
    orgParams,
    input?.client,
  );

  const results: GenerateMonthlyInvoicesResult[] = [];

  for (const org of orgs) {
    const result: GenerateMonthlyInvoicesResult = {
      organization_id: org.id,
      billing_year: billingYear,
      billing_month: billingMonth,
      created: 0,
      skipped: 0,
      zero_fee: 0,
      errors: [],
    };

    await syncOverdueInvoices(org.id, input?.client);

    const { rows: apartments } = await query<{
      id: string;
      monthly_fee: number;
      apartment_fee: number;
      parking_fee: number;
      water_fee: number;
      electricity_fee: number;
      apartment_number: string;
    }>(
      `
        SELECT id, monthly_fee, apartment_fee, parking_fee, water_fee, electricity_fee,
               apartment_number
          FROM apartments
         WHERE organization_id = $1
           AND status = 'OCCUPIED'
         ORDER BY apartment_number ASC
      `,
      [org.id],
      input?.client,
    );

    for (const apt of apartments) {
      try {
        let createdForApartment = 0;

        for (const feeType of INVOICE_FEE_TYPES) {
          const feeAmount = feeAmountFromApartment(apt, feeType);
          if (feeAmount <= 0) {
            result.zero_fee++;
            continue;
          }

          const existing = await getInvoiceForMonthAndFeeType(
            org.id,
            apt.id,
            billingYear,
            billingMonth,
            feeType,
            input?.client,
          );
          if (existing) {
            result.skipped++;
            continue;
          }

          const invoiceNumber = await nextInvoiceNumber(
            org.id,
            billingYear,
            billingMonth,
            feeType,
            input?.client,
          );
          const invoice = await createInvoice({
            organization_id: org.id,
            apartment_id: apt.id,
            invoice_number: invoiceNumber,
            billing_year: billingYear,
            billing_month: billingMonth,
            fee_type: feeType,
            amount: feeAmount,
            due_date: defaultDueDate(billingYear, billingMonth),
            status: 'PENDING',
            client: input?.client,
          });

          await createAuditLog({
            organization_id: org.id,
            action: 'INVOICE_GENERATED',
            entity_type: 'invoice',
            entity_id: invoice.id,
            new_data: {
              invoice_number: invoice.invoice_number,
              apartment_id: apt.id,
              fee_type: feeType,
              amount: invoice.amount,
              billing_year: billingYear,
              billing_month: billingMonth,
            },
            client: input?.client,
          });

          createdForApartment++;
          result.created++;
        }

        if (createdForApartment > 0) {
          await notifyApartmentResidents(
            org.id,
            apt.id,
            'Шинэ нэхэмжлэл',
            `${billingYear}/${billingMonth} сарын ${formatInvoicePeriod(billingYear, billingMonth)} нэхэмжлэл (${apt.apartment_number}) — ${createdForApartment} төрөл`,
            'INVOICE',
            input?.client,
          );
        }
      } catch (error) {
        result.errors.push(
          `${apt.apartment_number}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    results.push(result);
  }

  return results;
}

function formatInvoicePeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export async function cancelInvoice(
  invoiceId: string,
  actorId?: string | null,
  client?: DbClient,
): Promise<Invoice | null> {
  const existing = await getInvoiceById(invoiceId, client);
  if (!existing) return null;
  if (existing.status === 'CANCELLED') return existing;
  if (existing.status === 'PAID') {
    throw new Error('Төлсөн нэхэмжлэлийг цуцлах боломжгүй');
  }

  const run = async (tx: DbClient) => {
    const { rows } = await query<Invoice>(
      `
        UPDATE invoices
           SET status = 'CANCELLED'::inv_status
         WHERE id = $1
         RETURNING ${INVOICE_RETURNING}
      `,
      [invoiceId],
      tx,
    );
    const updated = rows[0] ?? null;
    if (updated) {
      await createAuditLog({
        organization_id: updated.organization_id,
        actor_id: actorId ?? null,
        action: 'INVOICE_CANCELLED',
        entity_type: 'invoice',
        entity_id: updated.id,
        old_data: { status: existing.status },
        new_data: { status: 'CANCELLED' },
        client: tx,
      });
    }
    return updated;
  };

  if (client) return run(client);
  return withTransaction(run);
}

const ADMIN_LIST_SQL = `
  SELECT i.id, i.organization_id, i.apartment_id, i.invoice_number,
         i.billing_year, i.billing_month, i.fee_type, i.amount,
         i.paid_amount, i.remaining_amount,
         i.due_date, i.status, i.created_at, i.updated_at,
         a.apartment_number, b.name AS building_name, a.tower,
         NULLIF(TRIM(CONCAT(owner.first_name, ' ', owner.last_name)), '') AS owner_name
    FROM invoices i
    JOIN apartments a ON a.id = i.apartment_id
    JOIN buildings b ON b.id = a.building_id
    LEFT JOIN residents owner
      ON owner.apartment_id = a.id AND owner.is_owner = TRUE AND owner.status = 'ACTIVE'
`;

export async function listInvoicesAdminView(
  organizationId: string | null,
  opts: PaginationOptions & {
    status?: InvoiceStatus;
    billing_year?: number;
    billing_month?: number;
    apartment_id?: string;
    search?: string;
  } = {},
): Promise<ListResult<InvoiceAdminRow>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'billing_year',
    orderDirection = 'DESC',
    status,
    billing_year,
    billing_month,
    apartment_id,
    search,
  } = opts;

  const safeOrder = ['invoice_number', 'billing_year', 'billing_month', 'amount', 'status', 'due_date', 'created_at', 'apartment_number'].includes(orderBy)
    ? orderBy
    : 'billing_year';
  const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';
  const orderColumn =
    safeOrder === 'apartment_number'
      ? 'a.apartment_number'
      : safeOrder === 'billing_year'
        ? `i.billing_year ${safeDir}, i.billing_month ${safeDir}`
        : `i."${safeOrder}" ${safeDir}`;

  const clauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (organizationId) {
    clauses.push(`i.organization_id = $${idx++}`);
    params.push(organizationId);
  }
  if (status) {
    clauses.push(`i.status = $${idx++}::inv_status`);
    params.push(status);
  }
  if (billing_year != null) {
    clauses.push(`i.billing_year = $${idx++}`);
    params.push(billing_year);
  }
  if (billing_month != null) {
    clauses.push(`i.billing_month = $${idx++}`);
    params.push(billing_month);
  }
  if (apartment_id) {
    clauses.push(`i.apartment_id = $${idx++}`);
    params.push(apartment_id);
  }
  if (search?.trim()) {
    const like = `%${search.trim().toLowerCase()}%`;
    clauses.push(`(
      LOWER(i.invoice_number) LIKE $${idx}
      OR LOWER(a.apartment_number) LIKE $${idx}
      OR LOWER(b.name) LIKE $${idx}
      OR LOWER(COALESCE(owner.first_name, '')) LIKE $${idx}
      OR LOWER(COALESCE(owner.last_name, '')) LIKE $${idx}
    )`);
    params.push(like);
    idx++;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const orderSql =
    safeOrder === 'billing_year'
      ? `ORDER BY i.billing_year ${safeDir}, i.billing_month ${safeDir}`
      : `ORDER BY ${orderColumn}`;

  const [dataRes, countRes] = await Promise.all([
    query<InvoiceAdminRow>(
      `${ADMIN_LIST_SQL} ${where} ${orderSql} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
          FROM invoices i
          JOIN apartments a ON a.id = i.apartment_id
          JOIN buildings b ON b.id = a.building_id
          LEFT JOIN residents owner
            ON owner.apartment_id = a.id AND owner.is_owner = TRUE AND owner.status = 'ACTIVE'
          ${where}
      `,
      params,
    ),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

const SELECT_SQL = `
  SELECT ${INVOICE_RETURNING}
    FROM invoices
`;

export async function getInvoiceById(
  id: string,
  client?: DbClient,
): Promise<Invoice | null> {
  const { rows } = await query<Invoice>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function getInvoiceForMonthAndFeeType(
  organizationId: string,
  apartmentId: string,
  year: number,
  month: number,
  feeType: InvoiceFeeType,
  client?: DbClient,
): Promise<Invoice | null> {
  const { rows } = await query<Invoice>(
    `${SELECT_SQL}
     WHERE organization_id = $1
       AND apartment_id = $2
       AND billing_year = $3
       AND billing_month = $4
       AND fee_type = $5::invoice_fee_type`,
    [organizationId, apartmentId, year, month, feeType],
    client,
  );
  return rows[0] ?? null;
}

export async function listInvoicesForMonth(
  organizationId: string,
  apartmentId: string,
  year: number,
  month: number,
  client?: DbClient,
): Promise<Invoice[]> {
  const { rows } = await query<Invoice>(
    `${SELECT_SQL}
     WHERE organization_id = $1
       AND apartment_id = $2
       AND billing_year = $3
       AND billing_month = $4
     ORDER BY fee_type ASC`,
    [organizationId, apartmentId, year, month],
    client,
  );
  return rows;
}

export async function listInvoicesByApartment(
  apartmentId: string,
  opts: PaginationOptions & { status?: InvoiceStatus } = {},
  client?: DbClient,
): Promise<ListResult<Invoice>> {
  const { limit = 50, offset = 0, orderBy = 'billing_year', orderDirection = 'DESC', status } = opts;
  const safeOrder = ['invoice_number', 'billing_year', 'billing_month', 'amount', 'status', 'due_date', 'created_at'].includes(orderBy)
    ? orderBy
    : 'billing_year';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = ['apartment_id = $1'];
  const params: unknown[] = [apartmentId];
  let idx = 2;

  if (status) {
    clauses.push(`status = $${idx++}::inv_status`);
    params.push(status);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  const order =
    safeOrder === 'billing_year'
      ? `ORDER BY billing_year ${safeDir}, billing_month ${safeDir}, fee_type ASC`
      : `ORDER BY "${safeOrder}" ${safeDir}`;

  const [dataRes, countRes] = await Promise.all([
    query<Invoice>(
      `${SELECT_SQL} ${where} ${order} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
      client,
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM invoices ${where}`,
      params,
      client,
    ),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function listInvoicesByOrganization(
  organizationId: string,
  opts: PaginationOptions & {
    status?: InvoiceStatus;
    billing_year?: number;
    billing_month?: number;
  } = {},
): Promise<ListResult<Invoice>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'billing_year',
    orderDirection = 'DESC',
    status,
    billing_year,
    billing_month,
  } = opts;

  const safeOrder = ['invoice_number', 'billing_year', 'billing_month', 'amount', 'status', 'due_date', 'created_at'].includes(orderBy)
    ? orderBy
    : 'billing_year';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = ['organization_id = $1'];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (status) {
    clauses.push(`status = $${idx++}::inv_status`);
    params.push(status);
  }
  if (billing_year != null) {
    clauses.push(`billing_year = $${idx++}`);
    params.push(billing_year);
  }
  if (billing_month != null) {
    clauses.push(`billing_month = $${idx++}`);
    params.push(billing_month);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;
  const order =
    safeOrder === 'billing_year'
      ? `ORDER BY billing_year ${safeDir}, billing_month ${safeDir}, fee_type ASC`
      : `ORDER BY "${safeOrder}" ${safeDir}`;

  const [dataRes, countRes] = await Promise.all([
    query<Invoice>(
      `${SELECT_SQL} ${where} ${order} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM invoices ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function createInvoice(input: {
  organization_id: string;
  apartment_id: string;
  invoice_number: string;
  billing_year: number;
  billing_month: number;
  fee_type: InvoiceFeeType;
  amount: number;
  paid_amount?: number;
  due_date?: string | null;
  status?: InvoiceStatus;
  client?: DbClient;
}): Promise<Invoice> {
  const {
    organization_id,
    apartment_id,
    invoice_number,
    billing_year,
    billing_month,
    fee_type,
    amount,
    paid_amount = 0,
    due_date = null,
    status = 'PENDING',
    client,
  } = input;

  const { rows } = await query<Invoice>(
    `
      INSERT INTO invoices
        (organization_id, apartment_id, invoice_number, billing_year, billing_month,
         fee_type, amount, paid_amount, due_date, status)
      VALUES ($1, $2, $3, $4, $5, $6::invoice_fee_type, $7, $8, $9, $10::inv_status)
      RETURNING ${INVOICE_RETURNING}
    `,
    [
      organization_id,
      apartment_id,
      invoice_number,
      billing_year,
      billing_month,
      fee_type,
      amount,
      paid_amount,
      due_date,
      status,
    ],
    client,
  );
  return rows[0];
}

export async function updateInvoice(
  id: string,
  input: Partial<
    Omit<Invoice, 'id' | 'organization_id' | 'apartment_id' | 'billing_year' | 'billing_month' | 'remaining_amount' | 'created_at' | 'updated_at'>
  >,
): Promise<Invoice | null> {
  const existing = await getInvoiceById(id);
  if (!existing) return null;

  const merged = {
    invoice_number: input.invoice_number ?? existing.invoice_number,
    amount: input.amount ?? existing.amount,
    paid_amount: input.paid_amount ?? existing.paid_amount,
    due_date: input.due_date ?? existing.due_date,
    status: input.status ?? existing.status,
  };

  const { rows } = await query<Invoice>(
    `
      UPDATE invoices
         SET invoice_number = $1, amount = $2, paid_amount = $3,
             due_date = $4, status = $5::inv_status
       WHERE id = $6
       RETURNING ${INVOICE_RETURNING}
    `,
    [
      merged.invoice_number,
      merged.amount,
      merged.paid_amount,
      merged.due_date,
      merged.status,
      id,
    ],
  );
  return rows[0] ?? null;
}

export async function addPaymentToInvoice(
  invoiceId: string,
  paymentAmount: number,
  client?: DbClient,
): Promise<Invoice | null> {
  const { rows } = await query<Invoice>(
    `
      UPDATE invoices
         SET paid_amount = paid_amount + $1
       WHERE id = $2
       RETURNING ${INVOICE_RETURNING}
    `,
    [paymentAmount, invoiceId],
    client,
  );
  return rows[0] ?? null;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  return withTransaction(async (tx) => {
    const { rowCount } = await query('DELETE FROM invoices WHERE id = $1', [id], tx);
    return (rowCount ?? 0) > 0;
  });
}
