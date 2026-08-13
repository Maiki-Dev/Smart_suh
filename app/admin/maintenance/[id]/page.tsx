import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { MaintenanceDetail } from '@/components/admin/MaintenanceDetail';
import {
  getMaintenanceRequestById,
  getMaintenanceAdminRowById,
  listMaintenanceCommentsWithAuthors,
} from '@/lib/queries/maintenance';
import { listAuditLogsByOrganization } from '@/lib/queries/audit_logs';
import { listUsersByOrganization, getUserById } from '@/lib/queries/users';
import { ArrowLeft } from 'lucide-react';

export default async function AdminMaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdminRole();
  const request = await getMaintenanceRequestById(id);
  if (!request) notFound();
  assertOrganizationAccess(ctx, request.organization_id);

  const orgId = request.organization_id;

  const [adminRow, comments, auditRes, usersRes] = await Promise.all([
    getMaintenanceAdminRowById(id),
    listMaintenanceCommentsWithAuthors(id),
    listAuditLogsByOrganization(orgId, {
      entity_type: 'maintenance_request',
      entity_id: id,
      limit: 50,
    }),
    listUsersByOrganization(orgId, { limit: 200 }),
  ]);

  if (!adminRow) notFound();

  const operators = usersRes.data.filter(
    (u) => ['OPERATOR', 'HOA_ADMIN'].includes(u.role) && u.status === 'ACTIVE',
  );

  const auditActors = await Promise.all(
    auditRes.data.map(async (log) => {
      if (!log.actor_id) return { logId: log.id, name: 'Систем' };
      const user = await getUserById(log.actor_id);
      return {
        logId: log.id,
        name: user ? `${user.last_name} ${user.first_name}` : '—',
      };
    }),
  );

  return (
      <AdminShell
        ctx={ctx}
        activeSegment="maintenance"
        pageTitle={request.title}
        pageSubtitle="Засварын хүсэлтийн дэлгэрэнгүй"
        headerRight={
          <Link
            href="/admin/maintenance"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="size-4" />
            Буцах
          </Link>
        }
      >
        <MaintenanceDetail
          request={adminRow}
          comments={comments}
          auditLogs={auditRes.data.map((log) => ({
            ...log,
            actor_name: auditActors.find((a) => a.logId === log.id)?.name ?? '—',
          }))}
          operators={operators.map((o) => ({
            id: o.id,
            name: `${o.last_name} ${o.first_name}`,
            role: o.role,
          }))}
        />
      </AdminShell>
  );
}
