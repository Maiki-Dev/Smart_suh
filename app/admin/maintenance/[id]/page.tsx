import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { MaintenanceDetail } from '@/components/admin/MaintenanceDetail';
import { getMaintenanceRequestById, listMaintenanceComments } from '@/lib/queries/maintenance';
import { listAuditLogsByOrganization } from '@/lib/queries/audit_logs';
import { listUsersByOrganization, getUserById } from '@/lib/queries/users';
import { listApartmentsAdminView } from '@/lib/queries/apartments';
import { ArrowLeft } from 'lucide-react';
import type { MaintenanceAdminRow } from '@/lib/queries/maintenance';

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

  const [comments, auditRes, usersRes, apartmentsRes] = await Promise.all([
    listMaintenanceComments(id),
    listAuditLogsByOrganization(orgId, {
      entity_type: 'maintenance_request',
      entity_id: id,
      limit: 50,
    }),
    listUsersByOrganization(orgId, { limit: 200 }),
    listApartmentsAdminView(orgId, { limit: 500 }),
  ]);

  const apt = apartmentsRes.data.find((a) => a.id === request.apartment_id);
  const operators = usersRes.data.filter(
    (u) => ['OPERATOR', 'HOA_ADMIN'].includes(u.role) && u.status === 'ACTIVE',
  );

  const commentAuthors = await Promise.all(
    comments.map(async (c) => {
      if (!c.user_id) return { commentId: c.id, name: 'Систем' };
      const user = await getUserById(c.user_id);
      return {
        commentId: c.id,
        name: user ? `${user.last_name} ${user.first_name}` : '—',
      };
    }),
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

  const adminRow: MaintenanceAdminRow = {
    ...request,
    apartment_number: apt?.apartment_number ?? '—',
    building_name: apt?.building_name ?? '—',
    tower: apt?.tower ?? null,
    resident_name: null,
    assigned_operator_name: null,
  };

  const assignedLog = auditRes.data.find((l) => l.action === 'MAINTENANCE_ASSIGNED');
  const assignedToId =
    assignedLog?.new_data && typeof assignedLog.new_data === 'object'
      ? (assignedLog.new_data as { assigned_to?: string }).assigned_to ?? null
      : null;

  return (
    <>
      <ThemeInitScript />
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
          comments={comments.map((c) => ({
            ...c,
            author_name: commentAuthors.find((a) => a.commentId === c.id)?.name ?? '—',
          }))}
          auditLogs={auditRes.data.map((log) => ({
            ...log,
            actor_name: auditActors.find((a) => a.logId === log.id)?.name ?? '—',
          }))}
          operators={operators.map((o) => ({
            id: o.id,
            name: `${o.last_name} ${o.first_name}`,
            role: o.role,
          }))}
          assignedToId={assignedToId}
        />
      </AdminShell>
    </>
  );
}
