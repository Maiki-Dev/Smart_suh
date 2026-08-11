import type { PaymentProvider, CreateManualPaymentInput, PaymentProviderResult } from './provider';

export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual';

  async createPayment(input: CreateManualPaymentInput): Promise<PaymentProviderResult> {
    return {
      success: true,
      provider: 'manual',
      transactionId: input.transactionId ?? null,
      message: 'Manual payment recorded',
    };
  }
}

export const manualPaymentProvider = new ManualPaymentProvider();
