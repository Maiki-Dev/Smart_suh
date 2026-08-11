import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { assertDatabaseUrl } from '@/lib/db-config';
import { buildVisitorQrPayload, expireVisitorPasses } from '@/lib/visitors/visitor-service';
import { countConsecutiveUnpaidMonths, shouldDisableGateAccess } from '@/lib/gate/consecutive-unpaid';
import { syncOverdueInvoicesWithNotifications } from '@/lib/invoices/overdue-service';
import { getFinancialReport } from '@/lib/queries/reports';
import { query } from '@/lib/db';

const root = process.cwd();
if (existsSync(resolve(root, '.env.local'))) {
  config({ path: resolve(root, '.env.local') });
}
config({ path: resolve(root, '.env') });

const ORG = '00000000-0000-0000-0000-000000000001';

function ok(label: string) {
  console.log(`✓ ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`✗ ${label}${detail ? `: ${detail}` : ''}`);
  process.exit(1);
}

async function main() {
  assertDatabaseUrl();

  const qr = buildVisitorQrPayload('00000000-0000-0000-0000-000000000099');
  if (!qr.startsWith('VP:')) fail('QR payload format');
  ok('Visitor QR payload format');

  const expired = await expireVisitorPasses(ORG);
  ok(`expireVisitorPasses ran (expired=${expired.expired})`);

  const overdue = await syncOverdueInvoicesWithNotifications(ORG);
  ok(`syncOverdueInvoicesWithNotifications ran (updated=${overdue.updated})`);

  const financial = await getFinancialReport({ organizationId: ORG });
  if (financial.total_invoiced < 0) fail('financial report');
  ok('Financial report query');

  const streak = countConsecutiveUnpaidMonths([]);
  if (streak !== 0 || shouldDisableGateAccess(streak)) fail('empty invoice streak');
  ok('Gate access logic preserved');

  const { rows: tables } = await query<{ table: string }>(
    `
      SELECT table_name AS table
        FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('visitor_passes', 'maintenance_requests', 'announcements', 'notifications', 'barrier_jobs')
       ORDER BY table_name
    `,
  );
  if (tables.length < 5) fail('required tables missing', JSON.stringify(tables));
  ok('Required Phase 7-10 tables exist');

  console.log('\n✓ Phase 7-10 integration tests passed');
}

main().catch((error) => {
  console.error('✗ Test failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
