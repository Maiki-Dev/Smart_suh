import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { assertDatabaseUrl } from '@/lib/db-config';
import { query } from '@/lib/db';
import { recordPayment } from '@/lib/payments/record-payment';
import {
  generateMonthlyInvoices,
  getApartmentDebt,
  getInvoiceById,
  syncOverdueInvoices,
} from '@/lib/queries/invoices';

const root = process.cwd();
if (existsSync(resolve(root, '.env.local'))) {
  config({ path: resolve(root, '.env.local') });
}
config({ path: resolve(root, '.env') });

const ORG = '00000000-0000-0000-0000-000000000001';
const APT_A101 = '00000000-0000-0000-0000-000000000010';
const INV_PENDING = '00000000-0000-0000-0000-000000000050';
const INV_PARTIAL = '00000000-0000-0000-0000-000000000051';
const INV_PAID = '00000000-0000-0000-0000-000000000052';
const INV_OVERDUE = '00000000-0000-0000-0000-000000000053';

function ok(label: string) {
  console.log(`✓ ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`✗ ${label}${detail ? `: ${detail}` : ''}`);
  process.exit(1);
}

async function main(): Promise<void> {
  assertDatabaseUrl();

  // Unpaid invoice stays PENDING with full remaining
  const pending = await getInvoiceById(INV_PENDING);
  if (!pending || pending.status !== 'PENDING' || pending.remaining_amount !== pending.amount) {
    fail('unpaid invoice', `status=${pending?.status} remaining=${pending?.remaining_amount}`);
  }
  ok('unpaid invoice (PENDING, full remaining)');

  // Overdue invoice
  const overdue = await getInvoiceById(INV_OVERDUE);
  if (!overdue || overdue.status !== 'OVERDUE') {
    fail('overdue invoice', `status=${overdue?.status}`);
  }
  ok('overdue invoice (OVERDUE)');

  // Paid invoice
  const paid = await getInvoiceById(INV_PAID);
  if (!paid || paid.status !== 'PAID' || Number(paid.remaining_amount) !== 0) {
    fail('paid invoice', `status=${paid?.status} remaining=${paid?.remaining_amount}`);
  }
  ok('paid invoice (PAID, zero remaining)');

  // Partial invoice
  const partialBefore = await getInvoiceById(INV_PARTIAL);
  if (!partialBefore || partialBefore.status !== 'PARTIAL') {
    fail('partial invoice seed', `status=${partialBefore?.status}`);
  }
  ok('partial invoice seed (PARTIAL)');

  const debtBefore = await getApartmentDebt(APT_A101);

  // Partial payment on PARTIAL invoice
  await recordPayment({
    organizationId: ORG,
    apartmentId: APT_A101,
    invoiceId: INV_PARTIAL,
    amount: 50000,
    paymentMethod: 'CASH',
    transactionId: 'TEST-PARTIAL-1',
  });
  const partialAfter = await getInvoiceById(INV_PARTIAL);
  if (!partialAfter || Number(partialAfter.paid_amount) !== Number(partialBefore!.paid_amount) + 50000) {
    fail('partial payment', `paid=${partialAfter?.paid_amount}`);
  }
  if (partialAfter!.status !== 'PARTIAL' && partialAfter!.status !== 'PAID') {
    fail('partial payment status', partialAfter!.status);
  }
  ok('partial payment updates paid amount');

  // Full payment on PENDING invoice
  const pendingBefore = await getInvoiceById(INV_PENDING);
  await recordPayment({
    organizationId: ORG,
    apartmentId: APT_A101,
    invoiceId: INV_PENDING,
    amount: pendingBefore!.remaining_amount,
    paymentMethod: 'BANK_TRANSFER',
    transactionId: 'TEST-FULL-1',
  });
  const pendingAfter = await getInvoiceById(INV_PENDING);
  if (!pendingAfter || pendingAfter.status !== 'PAID' || Number(pendingAfter.remaining_amount) !== 0) {
    fail('full payment', `status=${pendingAfter?.status} remaining=${pendingAfter?.remaining_amount}`);
  }
  ok('full payment marks invoice PAID');

  // Multiple payments on same invoice should fail when fully paid
  try {
    await recordPayment({
      organizationId: ORG,
      apartmentId: APT_A101,
      invoiceId: INV_PENDING,
      amount: 1000,
      paymentMethod: 'CASH',
    });
    fail('multiple payments after paid', 'expected error');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('бүрэн төлөгдсөн')) {
      fail('multiple payments after paid', error instanceof Error ? error.message : String(error));
    }
    ok('multiple payments blocked when invoice is PAID');
  }

  // Duplicate monthly invoice generation
  const now = new Date();
  const gen1 = await generateMonthlyInvoices({
    organizationId: ORG,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const createdFirst = gen1[0]?.created ?? 0;
  const gen2 = await generateMonthlyInvoices({
    organizationId: ORG,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const skippedSecond = gen2[0]?.skipped ?? 0;
  if (createdFirst > 0 && skippedSecond === 0) {
    fail('duplicate invoice prevention', `created=${createdFirst} skipped=${skippedSecond}`);
  }
  ok(`duplicate invoice prevention (created=${createdFirst}, skipped=${skippedSecond})`);

  // Sync overdue
  const synced = await syncOverdueInvoices(ORG);
  ok(`syncOverdueInvoices ran (${synced} updated)`);

  const debtAfter = await getApartmentDebt(APT_A101);
  if (debtAfter > debtBefore) {
    fail('apartment debt should not increase after payments');
  }
  ok(`apartment debt calculated (${debtAfter.toLocaleString('mn-MN')}₮)`);

  // Audit + notification smoke check for last payment
  const { rows: auditRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM audit_logs WHERE entity_type = 'payment' AND action = 'PAYMENT_RECORDED'`,
  );
  if (parseInt(auditRows[0].count, 10) < 2) {
    fail('audit logs for payments');
  }
  ok('audit logs created for payments');

  const { rows: notifRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications WHERE type = 'PAYMENT'`,
  );
  if (parseInt(notifRows[0].count, 10) < 2) {
    fail('payment notifications');
  }
  ok('payment notifications created');

  console.log('\n✓ All payment system tests passed');
}

main().catch((error) => {
  console.error('✗ Test run failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
