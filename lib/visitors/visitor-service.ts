import 'server-only';

import { query, type DbClient } from '@/lib/db';
import { createAuditLog } from '@/lib/queries/audit_logs';
import { createNotification } from '@/lib/queries/notifications';
import {
  createVisitorPass,
  updateVisitorPassStatus,
} from '@/lib/queries/visitors';

export const VISITOR_QR_PREFIX = 'VP:';

export function buildVisitorQrPayload(passId: string): string {
  return `${VISITOR_QR_PREFIX}${passId}`;
}

export interface ExpireVisitorPassesResult {
  expired: number;
  notified: number;
}

async function notifyApartmentResidents(
  organizationId: string,
  apartmentId: string,
  title: string,
  message: string,
  client?: DbClient,
): Promise<number> {
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

  let count = 0;
  for (const row of rows) {
    const exists = await query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
          FROM notifications
         WHERE user_id = $1
           AND type = 'SYSTEM'::notif_type
           AND title = $2
           AND message = $3
           AND created_at > NOW() - INTERVAL '7 days'
      `,
      [row.user_id, title, message],
      client,
    );
    if (parseInt(exists.rows[0]?.count ?? '0', 10) > 0) continue;

    await createNotification({
      organization_id: organizationId,
      user_id: row.user_id,
      type: 'SYSTEM',
      title,
      message,
      client,
    });
    count += 1;
  }
  return count;
}

export async function createVisitorPassWithQr(input: {
  organization_id: string;
  apartment_id: string;
  created_by?: string | null;
  visitor_name: string;
  phone?: string | null;
  plate_number?: string | null;
  valid_from: string;
  valid_until: string;
  client?: DbClient;
}): Promise<{ pass: import('@/types').VisitorPass; qrPayload: string }> {
  const pass = await createVisitorPass({
    ...input,
    qr_code: null,
    client: input.client,
  });

  const qrPayload = buildVisitorQrPayload(pass.id);
  const { rows } = await query<import('@/types').VisitorPass>(
    `
      UPDATE visitor_passes
         SET qr_code = $1
       WHERE id = $2
       RETURNING id, organization_id, apartment_id, created_by, visitor_name, phone,
                 plate_number, valid_from, valid_until, qr_code, status, created_at
    `,
    [qrPayload, pass.id],
    input.client,
  );

  return { pass: rows[0] ?? { ...pass, qr_code: qrPayload }, qrPayload };
}

export async function expireVisitorPasses(
  organizationId?: string,
  client?: DbClient,
): Promise<ExpireVisitorPassesResult> {
  const orgFilter = organizationId ? 'AND vp.organization_id = $1' : '';
  const params = organizationId ? [organizationId] : [];

  const { rows } = await query<{
    id: string;
    organization_id: string;
    apartment_id: string;
    visitor_name: string;
  }>(
    `
      SELECT id, organization_id, apartment_id, visitor_name
        FROM visitor_passes vp
       WHERE status = 'ACTIVE'::pass_status
         AND valid_until < NOW()
         ${orgFilter}
    `,
    params,
    client,
  );

  let expired = 0;
  let notified = 0;

  for (const row of rows) {
    const updated = await updateVisitorPassStatus(row.id, 'EXPIRED', client);
    if (!updated) continue;
    expired += 1;

    const title = 'Зочны эрх хугацаа дууссан';
    const message = `${row.visitor_name} зочны эрхийн хугацаа дууслаа.`;
    notified += await notifyApartmentResidents(
      row.organization_id,
      row.apartment_id,
      title,
      message,
      client,
    );

    await createAuditLog({
      organization_id: row.organization_id,
      actor_id: null,
      action: 'VISITOR_PASS_EXPIRED',
      entity_type: 'visitor_pass',
      entity_id: row.id,
      old_data: { status: 'ACTIVE' },
      new_data: { status: 'EXPIRED' },
      client,
    });
  }

  return { expired, notified };
}
