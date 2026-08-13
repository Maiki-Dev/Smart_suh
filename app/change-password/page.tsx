import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { getDefaultLandingPathForRole } from '@/lib/permissions';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export default async function ChangePasswordPage() {
  const ctx = await requireAuth({ skipPasswordChangeRedirect: true });
  if (!ctx.user.must_change_password) {
    redirect(getDefaultLandingPathForRole(ctx.user.role));
  }

  return <ChangePasswordForm />;
}
