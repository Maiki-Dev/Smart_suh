import 'server-only';

import { query, withTransaction } from '@/lib/db';
import { formatMNT } from '@/lib/admin/format';
import { manualPaymentProvider } from '@/lib/payments/manual-provider';
import type { CreateManualPaymentInput, PaymentProvider } from '@/lib/payments/provider';
import { createAuditLog } from '@/lib/queries/audit_logs';
import {
  addPaymentToInvoice,
  getApartmentDebt,
  getInvoiceById,
  syncInvoiceStatus,
} from '@/lib/queries/invoices';
import { createNotification } from '@/lib/queries/notifications';
import { createPayment } from '@/lib/queries/payments';
import { recalculateVehicleAccess } from '@/lib/gate/vehicle-access-service';
import type { Payment, PaymentMethod } from '@/types';

export interface RecordPaymentInput {
  organizationId: string;
  apartmentId: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string | null;
  createdBy?: string | null;
  provider?: PaymentProvider;
}

export interface RecordPaymentResult {
  payment: Payment;
  invoiceId: string;
  apartmentDebt: number;
  provider: string;
  vehicleAccessChanged: boolean;
}

async function notifyApartmentPayment(
  organizationId: string,
  apartmentId: string,
  title: string,
  message: string,
  client: Parameters<typeof createNotification>[0]['client'],
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

export async function recordPayment(input: RecordPaymentInput): Promise<RecordPaymentResult> {
  const provider = input.provider ?? manualPaymentProvider;

  if (input.amount <= 0) {
    throw new Error('Төлбөрийн дүн 0-ээс их байх ёстой');
  }

  return withTransaction(async (tx) => {
    const invoice = await getInvoiceById(input.invoiceId, tx);
    if (!invoice) throw new Error('Нэхэмжлэл олдсонгүй');
    if (invoice.organization_id !== input.organizationId) {
      throw new Error('Байгууллагын эрх хүрэлцэхгүй');
    }
    if (invoice.apartment_id !== input.apartmentId) {
      throw new Error('Орон сууц таарахгүй байна');
    }
    if (invoice.status === 'CANCELLED') {
      throw new Error('Цуцлагдсан нэхэмжлэлд төлбөр бүртгэх боломжгүй');
    }
    if (invoice.status === 'PAID' || invoice.paid_amount >= invoice.amount) {
      throw new Error('Нэхэмжлэл бүрэн төлөгдсөн байна');
    }
    if (input.amount > invoice.remaining_amount) {
      throw new Error(`Үлдэгдэл ${formatMNT(invoice.remaining_amount)}-с их төлбөр бүртгэх боломжгүй`);
    }

    const providerInput: CreateManualPaymentInput = {
      organizationId: input.organizationId,
      apartmentId: input.apartmentId,
      invoiceId: input.invoiceId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      transactionId: input.transactionId,
      createdBy: input.createdBy,
    };

    const providerResult = await provider.createPayment(providerInput);
    if (!providerResult.success) {
      throw new Error(providerResult.message ?? 'Төлбөр бүртгэхэд алдаа гарлаа');
    }

    const payment = await createPayment({
      organization_id: input.organizationId,
      apartment_id: input.apartmentId,
      invoice_id: input.invoiceId,
      amount: input.amount,
      payment_method: input.paymentMethod,
      transaction_id: providerResult.transactionId,
      created_by: input.createdBy ?? null,
      client: tx,
    });

    const updatedInvoice = await addPaymentToInvoice(input.invoiceId, input.amount, tx);
    if (!updatedInvoice) throw new Error('Нэхэмжлэл шинэчлэхэд алдаа гарлаа');

    const syncedInvoice = await syncInvoiceStatus(input.invoiceId, tx);
    const apartmentDebt = await getApartmentDebt(input.apartmentId, tx);

    await createAuditLog({
      organization_id: input.organizationId,
      actor_id: input.createdBy ?? null,
      action: 'PAYMENT_RECORDED',
      entity_type: 'payment',
      entity_id: payment.id,
      old_data: {
        invoice_id: invoice.id,
        paid_amount: invoice.paid_amount,
        remaining_amount: invoice.remaining_amount,
        status: invoice.status,
      },
      new_data: {
        payment_id: payment.id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        paid_amount: syncedInvoice?.paid_amount ?? updatedInvoice.paid_amount,
        remaining_amount: syncedInvoice?.remaining_amount ?? updatedInvoice.remaining_amount,
        status: syncedInvoice?.status ?? updatedInvoice.status,
        apartment_debt: apartmentDebt,
      },
      client: tx,
    });

    await notifyApartmentPayment(
      input.organizationId,
      input.apartmentId,
      'Төлбөр бүртгэгдлээ',
      `${formatMNT(input.amount)} төлбөр амжилттай бүртгэгдлэв. Үлдэгдэл: ${formatMNT(apartmentDebt)}`,
      tx,
    );

    const vehicleAccess = await recalculateVehicleAccess(input.apartmentId, {
      actorId: input.createdBy ?? null,
      triggeredBy: 'payment-recorded',
      client: tx,
    });

    return {
      payment,
      invoiceId: input.invoiceId,
      apartmentDebt,
      provider: provider.name,
      vehicleAccessChanged: vehicleAccess?.changed ?? false,
    };
  });
}
