import type { PaymentMethod } from '@/types';

export interface CreateManualPaymentInput {
  organizationId: string;
  apartmentId: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string | null;
  createdBy?: string | null;
}

export interface PaymentProviderResult {
  success: boolean;
  provider: 'manual';
  transactionId: string | null;
  message?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreateManualPaymentInput): Promise<PaymentProviderResult>;
}
