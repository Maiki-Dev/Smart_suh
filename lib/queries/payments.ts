import 'server-only';
import { query, withTransaction, type DbClient } from '@/lib/db';
import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaginationOptions,
  ListResult,
} from '@/types';

const SELECT_SQL = `
  SELECT id, organization_id, apartment_id, invoice_id, amount,
         payment_method, transaction_id, status, paid_at, created_by, created_at
    FROM payments
`;

export async function getPaymentById(
  id: string,
  client?: DbClient,
): Promise<Payment | null> {
  const { rows } = await query<Payment>(`${SELECT_SQL} WHERE id = $1`, [id], client);
  return rows[0] ?? null;
}

export async function listPaymentsByInvoice(
  invoiceId: string,
  opts: PaginationOptions = {},
): Promise<ListResult<Payment>> {
  const { limit = 50, offset = 0, orderBy = 'paid_at', orderDirection = 'DESC' } = opts;
  const safeOrder = ['amount', 'payment_method', 'status', 'paid_at', 'created_at'].includes(orderBy)
    ? orderBy
    : 'paid_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const [dataRes, countRes] = await Promise.all([
    query<Payment>(
      `${SELECT_SQL} WHERE invoice_id = $1 ORDER BY "${safeOrder}" ${safeDir} LIMIT $2 OFFSET $3`,
      [invoiceId, limit, offset],
    ),
    query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM payments WHERE invoice_id = $1',
      [invoiceId],
    ),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function listPaymentsByApartment(
  apartmentId: string,
  opts: PaginationOptions & { status?: PaymentStatus } = {},
): Promise<ListResult<Payment>> {
  const { limit = 50, offset = 0, orderBy = 'paid_at', orderDirection = 'DESC', status } = opts;
  const safeOrder = ['amount', 'payment_method', 'status', 'paid_at', 'created_at'].includes(orderBy)
    ? orderBy
    : 'paid_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = ['apartment_id = $1'];
  const params: unknown[] = [apartmentId];
  let idx = 2;

  if (status) {
    clauses.push(`status = $${idx++}::pay_status`);
    params.push(status);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  const [dataRes, countRes] = await Promise.all([
    query<Payment>(
      `${SELECT_SQL} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM payments ${where}`,
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

export async function listPaymentsByOrganization(
  organizationId: string,
  opts: PaginationOptions & {
    payment_method?: PaymentMethod;
    status?: PaymentStatus;
    start_date?: string;
    end_date?: string;
  } = {},
): Promise<ListResult<Payment>> {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'paid_at',
    orderDirection = 'DESC',
    payment_method,
    status,
    start_date,
    end_date,
  } = opts;

  const safeOrder = ['amount', 'payment_method', 'status', 'paid_at', 'created_at'].includes(orderBy)
    ? orderBy
    : 'paid_at';
  const safeDir = orderDirection === 'ASC' ? 'ASC' : 'DESC';

  const clauses: string[] = ['organization_id = $1'];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (payment_method) {
    clauses.push(`payment_method = $${idx++}::pay_method`);
    params.push(payment_method);
  }
  if (status) {
    clauses.push(`status = $${idx++}::pay_status`);
    params.push(status);
  }
  if (start_date) {
    clauses.push(`paid_at >= $${idx++}`);
    params.push(start_date);
  }
  if (end_date) {
    clauses.push(`paid_at <= $${idx++}`);
    params.push(end_date);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  const [dataRes, countRes] = await Promise.all([
    query<Payment>(
      `${SELECT_SQL} ${where} ORDER BY "${safeOrder}" ${safeDir} LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM payments ${where}`,
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

export async function createPayment(input: {
  organization_id: string;
  apartment_id: string;
  invoice_id?: string | null;
  amount: number;
  payment_method: PaymentMethod;
  transaction_id?: string | null;
  status?: PaymentStatus;
  paid_at?: string;
  created_by?: string | null;
  client?: DbClient;
}): Promise<Payment> {
  const {
    organization_id,
    apartment_id,
    invoice_id = null,
    amount,
    payment_method,
    transaction_id = null,
    status = 'CONFIRMED',
    paid_at = new Date().toISOString(),
    created_by = null,
    client,
  } = input;

  const { rows } = await query<Payment>(
    `
      INSERT INTO payments
        (organization_id, apartment_id, invoice_id, amount, payment_method,
         transaction_id, status, paid_at, created_by)
      VALUES ($1, $2, $3, $4, $5::pay_method, $6, $7::pay_status, $8, $9)
      RETURNING id, organization_id, apartment_id, invoice_id, amount,
                payment_method, transaction_id, status, paid_at, created_by, created_at
    `,
    [organization_id, apartment_id, invoice_id, amount, payment_method, transaction_id, status, paid_at, created_by],
    client,
  );
  return rows[0];
}

export async function updatePayment(
  id: string,
  input: Partial<Pick<Payment, 'payment_method' | 'transaction_id' | 'status' | 'paid_at'>>,
): Promise<Payment | null> {
  const existing = await getPaymentById(id);
  if (!existing) return null;

  const { rows } = await query<Payment>(
    `
      UPDATE payments
         SET payment_method = $1::pay_method,
             transaction_id = $2,
             status = $3::pay_status,
             paid_at = $4
       WHERE id = $5
       RETURNING id, organization_id, apartment_id, invoice_id, amount,
                 payment_method, transaction_id, status, paid_at, created_by, created_at
    `,
    [
      input.payment_method ?? existing.payment_method,
      input.transaction_id ?? existing.transaction_id,
      input.status ?? existing.status,
      input.paid_at ?? existing.paid_at,
      id,
    ],
  );
  return rows[0] ?? null;
}

export async function deletePayment(id: string): Promise<boolean> {
  return withTransaction(async (tx) => {
    const { rowCount } = await query('DELETE FROM payments WHERE id = $1', [id], tx);
    return (rowCount ?? 0) > 0;
  });
}
