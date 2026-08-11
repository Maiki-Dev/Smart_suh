import { getCurrentAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getDefaultLandingPathForRole } from '@/lib/permissions';

export default async function HomePage() {
  const ctx = await getCurrentAuth();
  if (!ctx) {
    redirect('/login');
  }
  redirect(getDefaultLandingPathForRole(ctx.user.role));
}
