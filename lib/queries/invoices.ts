import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type { Invoice, InvoiceStatus, PaginationOptions, ListResult } from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, apartment_id, invoice_number,
         billing_year, billing_month, amount, paid_amount, remaining_amount,
         due_date, status, created_at, updated_at
    FROM invoices
`;

export async function getInvoiceById(
  id: string,
  client?: DbClient,
): Promise<Invoice | null> {
  const { rows } = await query<Invoice>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function getInvoiceForMonth(
  organizationId: string,
  apartmentId: string,
  year: number,
  month: number,
  client?: DbClient,
): Promise<Invoice | null> {
  const { rows } = await query<Invoice>(
    `${SELECT_SQL} WHERE organization_id = $1 AND apartment_id = $2 AND billing_year = $3 AND billing_month = $4`,
    [organizationId, apartmentId, year, month],
    client,
  );
  return rows[0] ?? null;
}

export async function listInvoicesByApartment(
  apartmentId: string,
  opts: PaginationOptions & { status?: InvoiceStatus } = {},
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
      ? `ORDER BY billing_year ${safeDir}, billing_month ${safeDir}`
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
      ? `ORDER BY billing_year ${safeDir}, billing_month ${safeDir}`
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
         amount, paid_amount, due_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::inv_status)
      RETURNING id, organization_id, apartment_id, invoice_number,
                billing_year, billing_month, amount, paid_amount, remaining_amount,
                due_date, status, created_at, updated_at
    `,
    [organization_id, apartment_id, invoice_number, billing_year, billing_month, amount, paid_amount, due_date, status],
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
       RETURNING id, organization_id, apartment_id, invoice_number,
                 billing_year, billing_month, amount, paid_amount, remaining_amount,
                 due_date, status, created_at, updated_at
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
       RETURNING id, organization_id, apartment_id, invoice_number,
                 billing_year, billing_month, amount, paid_amount, remaining_amount,
                 due_date, status, created_at, updated_at
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
