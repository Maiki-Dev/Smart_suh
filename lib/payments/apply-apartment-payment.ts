import 'server-only';

import { query, withTransaction, type DbClient } from '@/lib/db';
import { formatMNT } from '@/lib/admin/format';
import { createAuditLog } from '@/lib/queries/audit_logs';
import {
  addPaymentToInvoice,
  getApartmentDebt,
  listInvoicesByApartment,
  syncInvoiceStatus,
} from '@/lib/queries/invoices';
import { createNotification } from '@/lib/queries/notifications';
import { createPayment, getPaymentById } from '@/lib/queries/payments';
import { recalculateVehicleAccess } from '@/lib/gate/vehicle-access-service';
import type { Invoice, Payment, PaymentMethod } from '@/types';

export interface ApplyApartmentPaymentInput {
  organizationId: string;
  apartmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string | null;
  paidAt?: string;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
}

export interface ApplyApartmentPaymentResult {
  payments: Payment[];
  invoicesUpdated: Array<{
    invoiceId: string;
    invoiceNumber: string;
    applied: number;
  }>;
  apartmentDebt: number;
  remainingUnapplied: number;
  vehicleAccessChanged: boolean;
}

async function findOrCreateIdempotency(client: DbClient, key: string): Promise<boolean> {
  const { rows } = await query<{ id: string }>(
    `
      SELECT id FROM payments
       WHERE transaction_id = $1 AND status = 'CONFIRMED'
       LIMIT 1
    `,
    [key],
    client,
  );
  return rows.length > 0;
}

async function notifyApartmentPayment(
  organizationId: string,
  apartmentId: string,
  title: string,
  message: string,
  client: DbClient,
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
      type: 'PAYMENT',
      title,
      message,
      client,
    });
  }
}

function pickOpenInvoices(
  allInvoices: Invoice[],
  maxAmount: number,
): Array<{ invoice: Invoice; apply: number; remaining: number }> {
  const open = allInvoices.filter(
    (i) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.remaining_amount > 0,
  );

  open.sort((a, b) => {
    if (a.billing_year !== b.billing_year) return a.billing_year - b.billing_year;
    if (a.billing_month !== b.billing_month) return a.billing_month - b.billing_month;
    const order: Record<string, number> = { PARKING: 0, APARTMENT: 1, WATER: 2, ELECTRICITY: 3 };
    return (order[a.fee_type] ?? 99) - (order[b.fee_type] ?? 99);
  });

  const results: Array<{ invoice: Invoice; apply: number; remaining: number }> = [];
  let remaining = maxAmount;
  for (const inv of open) {
    if (remaining <= 0) break;
    const apply = Math.min(inv.remaining_amount, remaining);
    if (apply <= 0) continue;
    results.push({ invoice: inv, apply, remaining: inv.remaining_amount - apply });
    remaining -= apply;
  }
  return results;
}

export async function applyApartmentPayment(
  input: ApplyApartmentPaymentInput,
): Promise<ApplyApartmentPaymentResult> {
  if (input.amount <= 0) {
    throw new Error('Төлбөрийн дүн 0-ээс их байх ёстой');
  }

  return withTransaction(async (tx) => {
    if (input.idempotencyKey && input.idempotencyKey.trim()) {
      const exists = await findOrCreateIdempotency(tx, input.idempotencyKey.trim());
      if (exists) {
        return {
          payments: [],
          invoicesUpdated: [],
          apartmentDebt: await getApartmentDebt(input.apartmentId, tx),
          remainingUnapplied: 0,
          vehicleAccessChanged: false,
        };
      }
    }

    const { data: invoices } = await listInvoicesByApartment(
      input.apartmentId,
      { limit: 1000, orderBy: 'billing_year', orderDirection: 'ASC' },
      tx,
    );

    const picks = pickOpenInvoices(invoices, input.amount);
    const payments: Payment[] = [];
    const invoicesUpdated: ApplyApartmentPaymentResult['invoicesUpdated'] = [];
    let runningAmount = input.amount;

    const paidAt = input.paidAt ?? new Date().toISOString();
    const txIdBase = input.transactionId?.trim() || undefined;

    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      const thisTxId =
        picks.length === 1
          ? txIdBase ?? null
          : txIdBase
            ? `${txIdBase}-${i + 1}`
            : null;

      const payment = await createPayment({
        organization_id: input.organizationId,
        apartment_id: input.apartmentId,
        invoice_id: p.invoice.id,
        amount: p.apply,
        payment_method: input.paymentMethod,
        transaction_id: thisTxId,
        status: 'CONFIRMED',
        paid_at: paidAt,
        created_by: input.createdBy ?? null,
        client: tx,
      });
      payments.push(payment);
      runningAmount -= p.apply;

      const before = p.invoice;
      await addPaymentToInvoice(p.invoice.id, p.apply, tx);
      const after = await syncInvoiceStatus(p.invoice.id, tx);

      invoicesUpdated.push({
        invoiceId: p.invoice.id,
        invoiceNumber: p.invoice.invoice_number,
        applied: p.apply,
      });

      await createAuditLog({
        organization_id: input.organizationId,
        actor_id: input.createdBy ?? null,
        action: 'PAYMENT_RECORDED',
        entity_type: 'payment',
        entity_id: payment.id,
        old_data: {
          invoice_id: before.id,
          invoice_number: before.invoice_number,
          paid_amount: before.paid_amount,
          remaining_amount: before.remaining_amount,
          status: before.status,
          ...(input.metadata ? { metadata: input.metadata } : {}),
        },
        new_data: {
          payment_id: payment.id,
          amount: payment.amount,
          payment_method: payment.payment_method,
          paid_amount: after?.paid_amount ?? before.paid_amount + p.apply,
          remaining_amount: after?.remaining_amount ?? before.remaining_amount - p.apply,
          status: after?.status ?? before.status,
        },
        client: tx,
      });
    }

    const apartmentDebt = await getApartmentDebt(input.apartmentId, tx);

    if (payments.length > 0) {
      const totalApplied = input.amount - runningAmount;
      await notifyApartmentPayment(
        input.organizationId,
        input.apartmentId,
        'Төлбөр бүртгэгдлээ',
        `${formatMNT(totalApplied)} төлбөр амжилттай бүртгэгдэв. Үлдэгдэл: ${formatMNT(apartmentDebt)}`,
        tx,
      );
    }

    const vehicleAccess = await recalculateVehicleAccess(input.apartmentId, {
      actorId: input.createdBy ?? null,
      triggeredBy: 'wiremn-webhook',
      client: tx,
    });

    return {
      payments,
      invoicesUpdated,
      apartmentDebt,
      remainingUnapplied: runningAmount,
      vehicleAccessChanged: vehicleAccess?.changed ?? false,
    };
  });
}

export async function getPaymentByWireTransactionId(
  transactionId: string,
  client?: DbClient,
): Promise<Payment | null> {
  if (!transactionId.trim()) return null;
  const { rows } = await query<Payment>(
    `
      SELECT id, organization_id, apartment_id, invoice_id, amount,
             payment_method, transaction_id, status, paid_at, created_by, created_at
        FROM payments
       WHERE transaction_id = $1
       LIMIT 1
    `,
    [transactionId.trim()],
    client,
  );
  return rows[0] ?? null;
}
