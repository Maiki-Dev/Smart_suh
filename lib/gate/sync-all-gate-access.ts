import 'server-only';

import { query } from '@/lib/db';
import { recalculateVehicleAccess } from '@/lib/gate/vehicle-access-service';

export interface SyncAllGateAccessResult {
  processed: number;
  changed: number;
  errors: string[];
}

export async function syncAllGateAccess(organizationId?: string): Promise<SyncAllGateAccessResult> {
  const orgFilter = organizationId ? 'WHERE organization_id = $1' : '';
  const params = organizationId ? [organizationId] : [];

  const { rows } = await query<{ id: string }>(
    `
      SELECT DISTINCT apartment_id AS id
        FROM vehicles
       WHERE active = TRUE
         ${organizationId ? 'AND organization_id = $1' : ''}
    `,
    params,
  );

  if (rows.length === 0) {
    const { rows: aptRows } = await query<{ id: string }>(
      `SELECT id FROM apartments ${orgFilter}${organizationId ? ' AND' : ' WHERE'} status = 'OCCUPIED'::apt_status`,
      params,
    );
    rows.push(...aptRows);
  }

  const seen = new Set<string>();
  let processed = 0;
  let changed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    processed += 1;
    try {
      const result = await recalculateVehicleAccess(row.id, {
        triggeredBy: 'cron-sync-gate-access',
      });
      if (result?.changed) changed += 1;
    } catch (error) {
      errors.push(
        `${row.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  return { processed, changed, errors };
}
