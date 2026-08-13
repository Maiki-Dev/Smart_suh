import { notFound } from 'next/navigation';
import { requireAdminRole } from '@/lib/permissions';
import { AdminShell } from '@/components/layout/AdminShell';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { loadSettingsPageData } from '@/app/admin/settings/actions';

export default async function AdminSettingsPage() {
  const ctx = await requireAdminRole();
  const data = await loadSettingsPageData(ctx.user.organization_id);
  if (!data) notFound();

  const canManageOrganization =
    ctx.user.role === 'HOA_ADMIN' || ctx.user.role === 'SUPER_ADMIN';

  const { password_hash: _passwordHash, organization: _organization, ...safeUser } = ctx.user;

  return (
      <AdminShell
        ctx={ctx}
        activeSegment="settings"
        pageTitle="Тохиргоо"
        pageSubtitle="Байгууллага, системийн дүрэм, профайл"
      >
        <SettingsPanel
          organization={data.organization}
          settings={data.settings}
          user={safeUser}
          canManageOrganization={canManageOrganization}
        />
      </AdminShell>
  );
}
