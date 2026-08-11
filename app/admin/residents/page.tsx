import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { ResidentManagement } from '@/components/admin/ResidentManagement';
import { listApartmentsAdminView } from '@/lib/queries/apartments';
import { listResidentsAdminView } from '@/lib/queries/residents';
import type { ResidentStatus } from '@/types';

export default async function AdminResidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireAdminRole();
  const orgScope = getScopedOrganizationId(ctx);

  const [residentsRes, apartmentsRes] = await Promise.all([
    listResidentsAdminView(orgScope, {
      search: params.q,
      status: (params.status as ResidentStatus | undefined) || undefined,
      limit: 200,
    }),
    listApartmentsAdminView(orgScope, { limit: 500 }),
  ]);

  return (
    <>
      <ThemeInitScript />
      <AdminShell
        ctx={ctx}
        activeSegment="residents"
        pageTitle="Оршин суугч"
        pageSubtitle="Оршин суугчийн бүртгэл, хайлт, шүүлт"
      >
        <ResidentManagement
          residents={residentsRes.data}
          apartments={apartmentsRes.data}
          filters={{
            q: params.q,
            status: params.status,
          }}
          total={residentsRes.total}
        />
      </AdminShell>
    </>
  );
}
