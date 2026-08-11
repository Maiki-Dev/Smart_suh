import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { assertDatabaseUrl } from '@/lib/db-config';
import {
  countConsecutiveUnpaidMonths,
  shouldDisableGateAccess,
} from '@/lib/gate/consecutive-unpaid';
import { recalculateVehicleAccess } from '@/lib/gate/vehicle-access-service';
import { query } from '@/lib/db';
import { recordPayment } from '@/lib/payments/record-payment';
import { getDefaultVehicleForApartment } from '@/lib/queries/vehicles';
import type { Invoice } from '@/types';

const root = process.cwd();
if (existsSync(resolve(root, '.env.local'))) {
  config({ path: resolve(root, '.env.local') });
}
config({ path: resolve(root, '.env') });

const ORG = '00000000-0000-0000-0000-000000000001';
const APT = '00000000-0000-0000-0000-000000000010';
const VEHICLE = '00000000-0000-0000-0000-000000000040';

function ok(label: string) {
  console.log(`✓ ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`✗ ${label}${detail ? `: ${detail}` : ''}`);
  process.exit(1);
}

function inv(year: number, month: number, status: Invoice['status'], remaining: number, paid = 0): Invoice {
  return {
    id: `${year}-${month}`,
    organization_id: ORG,
    apartment_id: APT,
    invoice_number: `T-${year}-${month}`,
    billing_year: year,
    billing_month: month,
    amount: 250000,
    paid_amount: paid,
    remaining_amount: remaining,
    due_date: null,
    status,
    created_at: '',
    updated_at: '',
  };
}

async function setInvoices(rows: Array<{ year: number; month: number; status: Invoice['status']; paid: number }>) {
  await query('DELETE FROM invoices WHERE apartment_id = $1', [APT]);
  for (const row of rows) {
    const amount = 250000;
    const paid = row.paid;
    await query(
      `
        INSERT INTO invoices
          (organization_id, apartment_id, invoice_number, billing_year, billing_month,
           amount, paid_amount, due_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, '2025-12-10', $8::inv_status)
      `,
      [ORG, APT, `TEST-${row.year}-${row.month}`, row.year, row.month, amount, paid, row.status],
    );
  }
}

async function main() {
  assertDatabaseUrl();

  // Unit: consecutive unpaid logic
  const oneUnpaid = countConsecutiveUnpaidMonths([
    inv(2025, 7, 'PAID', 0, 250000),
    inv(2025, 8, 'PENDING', 250000),
  ]);
  if (oneUnpaid !== 1 || shouldDisableGateAccess(oneUnpaid)) fail('1 unpaid month');
  ok('1 unpaid month → ACTIVE');

  const twoConsecutive = countConsecutiveUnpaidMonths([
    inv(2025, 7, 'PAID', 0, 250000),
    inv(2025, 8, 'PENDING', 250000),
    inv(2025, 9, 'OVERDUE', 250000),
  ]);
  if (twoConsecutive !== 2 || !shouldDisableGateAccess(twoConsecutive)) fail('2 consecutive unpaid');
  ok('2 consecutive unpaid months → DISABLED');

  const threeConsecutive = countConsecutiveUnpaidMonths([
    inv(2025, 5, 'PENDING', 250000),
    inv(2025, 6, 'PARTIAL', 150000, 100000),
    inv(2025, 7, 'OVERDUE', 250000),
  ]);
  if (threeConsecutive !== 3 || !shouldDisableGateAccess(threeConsecutive)) fail('3 consecutive unpaid');
  ok('3 consecutive unpaid months → DISABLED');

  const nonConsecutive = countConsecutiveUnpaidMonths([
    inv(2025, 7, 'PENDING', 250000),
    inv(2025, 8, 'PAID', 0, 250000),
    inv(2025, 9, 'PENDING', 250000),
  ]);
  if (nonConsecutive !== 1 || shouldDisableGateAccess(nonConsecutive)) fail('non-consecutive unpaid');
  ok('non-consecutive unpaid → ACTIVE');

  // Integration: disable then restore via payment
  await setInvoices([
    { year: 2025, month: 7, status: 'PAID', paid: 250000 },
    { year: 2025, month: 8, status: 'PENDING', paid: 0 },
    { year: 2025, month: 9, status: 'PENDING', paid: 0 },
  ]);

  let vehicle = await getDefaultVehicleForApartment(APT);
  if (!vehicle) fail('seed vehicle missing');

  await query(
    `UPDATE vehicles SET gate_access = TRUE, disabled_at = NULL, disabled_reason = NULL WHERE id = $1`,
    [VEHICLE],
  );

  const disabled = await recalculateVehicleAccess(APT, { triggeredBy: 'test' });
  if (!disabled?.changed || disabled.gateAccess !== false) {
    fail('recalculate should disable access', JSON.stringify(disabled));
  }
  ok('recalculate disables gate access after 2 unpaid months');

  vehicle = await getDefaultVehicleForApartment(APT);
  if (vehicle?.gate_access !== false) fail('vehicle gate_access not false');

  const { rows: invRows } = await query<{ id: string; remaining_amount: string }>(
    `SELECT id, remaining_amount::text FROM invoices WHERE apartment_id = $1 AND billing_year = 2025 AND billing_month = 8 LIMIT 1`,
    [APT],
  );
  const augustInvoice = invRows[0];
  if (!augustInvoice) fail('august invoice missing');

  await recordPayment({
    organizationId: ORG,
    apartmentId: APT,
    invoiceId: augustInvoice.id,
    amount: Number(augustInvoice.remaining_amount),
    paymentMethod: 'CASH',
    transactionId: 'TEST-GATE-RESTORE',
  });

  vehicle = await getDefaultVehicleForApartment(APT);
  if (vehicle?.gate_access !== true) {
    fail('payment restore access', `gate_access=${vehicle?.gate_access}`);
  }
  ok('payment restores gate access');

  const { rows: jobRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM barrier_jobs WHERE vehicle_id = $1`,
    [VEHICLE],
  );
  if (parseInt(jobRows[0].count, 10) < 1) fail('barrier jobs not created');
  ok('barrier jobs created on status change');

  console.log('\n✓ All vehicle access tests passed');
}

main().catch((error) => {
  console.error('✗ Test failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
