import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { MaintenanceManagement } from '@/components/admin/MaintenanceManagement';
import { listMaintenanceAdminView } from '@/lib/queries/maintenance';
import type { MaintenanceCategory, MaintenancePriority, MaintenanceStatus } from '@/types';

export default async function AdminMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);

  const maintenanceRes = await listMaintenanceAdminView(orgScope, {
    search: params.q,
    status: (params.status as MaintenanceStatus | undefined) || undefined,
    priority: (params.priority as MaintenancePriority | undefined) || undefined,
    category: (params.category as MaintenanceCategory | undefined) || undefined,
    limit: 200,
  });

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="maintenance"
        pageTitle="Засвар"
        pageSubtitle="Оршин суугчийн засварын хүсэлтүүд, төлөв удирдах"
      >
        <MaintenanceManagement
          requests={maintenanceRes.data}
          filters={{
            q: params.q,
            status: params.status,
            priority: params.priority,
            category: params.category,
          }}
          total={maintenanceRes.total}
        />
      </AdminShell>
    </>
  );
}
