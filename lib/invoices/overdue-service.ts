import 'server-only';

import { query } from '@/lib/db';
import { createNotification } from '@/lib/queries/notifications';
import type { DbClient } from '@/lib/db';

export async function notifyOverdueInvoices(
  organizationId: string,
  client?: DbClient,
): Promise<number> {
  const { rows } = await query<{
    id: string;
    apartment_id: string;
    invoice_number: string;
    remaining_amount: string;
  }>(
    `
      SELECT id, apartment_id, invoice_number, remaining_amount::text
        FROM invoices
       WHERE organization_id = $1
         AND status = 'OVERDUE'::inv_status
         AND remaining_amount > 0
    `,
    [organizationId],
    client,
  );

  let notified = 0;
  for (const invoice of rows) {
    const { rows: residents } = await query<{ user_id: string }>(
      `
        SELECT user_id FROM residents
         WHERE apartment_id = $1 AND status = 'ACTIVE' AND user_id IS NOT NULL
      `,
      [invoice.apartment_id],
      client,
    );

    const title = 'Төлбөр хугацаа хэтэрсэн';
    const message = `${invoice.invoice_number} нэхэмжлэлийн үлдэгдэл ${Number(invoice.remaining_amount).toLocaleString('mn-MN')}₮ хугацаа хэтэрсэн байна.`;

    for (const resident of residents) {
      const dup = await query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count FROM notifications
           WHERE user_id = $1 AND type = 'INVOICE'::notif_type
             AND title = $2 AND message = $3
             AND created_at > NOW() - INTERVAL '30 days'
        `,
        [resident.user_id, title, message],
        client,
      );
      if (parseInt(dup.rows[0]?.count ?? '0', 10) > 0) continue;

      await createNotification({
        organization_id: organizationId,
        user_id: resident.user_id,
        type: 'INVOICE',
        title,
        message,
        client,
      });
      notified += 1;
    }
  }

  return notified;
}

export async function syncOverdueInvoicesWithNotifications(
  organizationId?: string,
): Promise<{ updated: number; notified: number }> {
  const orgFilter = organizationId ? 'WHERE id = $1' : '';
  const orgParams = organizationId ? [organizationId] : [];

  const { rows: orgs } = await query<{ id: string }>(
    `SELECT id FROM organizations ${orgFilter}`,
    orgParams,
  );

  let updated = 0;
  let notified = 0;

  for (const org of orgs) {
    const { rowCount } = await query(
      `
        UPDATE invoices
           SET status = 'OVERDUE'::inv_status
         WHERE organization_id = $1
           AND status IN ('PENDING', 'PARTIAL')
           AND due_date IS NOT NULL
           AND due_date < CURRENT_DATE
           AND paid_amount < amount
      `,
      [org.id],
    );
    updated += rowCount ?? 0;
    notified += await notifyOverdueInvoices(org.id);
  }

  return { updated, notified };
}
