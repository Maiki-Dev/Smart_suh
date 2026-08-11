import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { GateAccessManagement } from '@/components/admin/GateAccessManagement';
import { listGateAccessLogsAdminView } from '@/lib/queries/gate_access_logs';
import type { GateAction } from '@/types';

export default async function AdminGateAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; apartment?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);

  const logsRes = await listGateAccessLogsAdminView(orgScope, {
    search: params.q,
    action: (params.action as GateAction | undefined) || undefined,
    apartment_id: params.apartment || undefined,
    limit: 200,
  });

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="gate-access"
        pageTitle="Зогсоолын эрх"
        pageSubtitle="Орсон, гарсан, хориглосон бүх бичлэг"
      >
        <GateAccessManagement
          logs={logsRes.data}
          filters={{ q: params.q, action: params.action, apartment: params.apartment }}
          total={logsRes.total}
        />
      </AdminShell>
    </>
  );
}
