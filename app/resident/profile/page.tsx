import { requireRole } from '@/lib/permissions';
import { getResidentOverviewStats } from '@/lib/queries/dashboard';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ThemeInitScript } from '@/components/layout/ThemeInitScript';
import { ResidentProfilePanel } from '@/components/resident/ResidentProfilePanel';

export default async function ResidentProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await requireRole(['RESIDENT']);
  const params = await searchParams;
  const overview = await getResidentOverviewStats(ctx.user.organization_id, ctx.user.id);

  const apartmentLabel = overview.apartment
    ? [overview.apartment.tower, overview.apartment.apartment_number].filter(Boolean).join(' · ')
    : '—';

  const initialTab = params.tab === 'password' ? 'password' : 'profile';
  const { password_hash: _passwordHash, ...publicUser } = ctx.user;

  return (
    <>
      <ThemeInitScript />
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={overview.unread_notifications}
        activeSegment="profile"
        pageTitle="Профайл"
        pageSubtitle="Хувийн мэдээлэл, нууц үг"
      >
        <ResidentProfilePanel
          user={publicUser}
          apartmentLabel={apartmentLabel}
          initialTab={initialTab}
        />
      </ResidentShell>
    </>
  );
}
