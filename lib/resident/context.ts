import 'server-only';

import type { AuthContext } from '@/lib/auth/session';
import { getResidentOverviewStats } from '@/lib/queries/dashboard';

export async function getResidentApartmentContext(ctx: AuthContext) {
  const overview = await getResidentOverviewStats(ctx.user.organization_id, ctx.user.id);
  const apartment = overview.apartment;
  const apartmentLabel = apartment
    ? [apartment.tower, apartment.apartment_number].filter(Boolean).join(' · ')
    : '—';

  return {
    apartmentId: apartment?.id ?? null,
    apartmentLabel,
    unreadNotifications: overview.unread_notifications,
  };
}
