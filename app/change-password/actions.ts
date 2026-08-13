'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { getDefaultLandingPathForRole } from '@/lib/permissions';
import { updateUser } from '@/lib/queries/users';
import { DEFAULT_RESIDENT_PASSWORD } from '@/lib/resident/provision-login';

const changePasswordSchema = z
  .object({
    password: z.string().min(8, { message: 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой' }),
    confirmPassword: z.string().min(8, { message: 'Нууц үг давтах шаардлагатай' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Нууц үг таарахгүй байна',
    path: ['confirmPassword'],
  });

export type ChangePasswordActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  fieldErrors?: {
    password?: string[];
    confirmPassword?: string[];
  };
};

export async function changePasswordAction(
  _prevState: ChangePasswordActionState,
  formData: FormData,
): Promise<ChangePasswordActionState> {
  const ctx = await requireAuth({ skipPasswordChangeRedirect: true });

  if (!ctx.user.must_change_password) {
    redirect(getDefaultLandingPathForRole(ctx.user.role));
  }

  const validated = changePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл зөв оруулна уу',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { password } = validated.data;

  if (password === DEFAULT_RESIDENT_PASSWORD) {
    return {
      status: 'error',
      message: 'Анхны нууц үгээ дахин ашиглах боломжгүй. Өөр нууц үг сонгоно уу.',
    };
  }

  const sameAsCurrent = await verifyPassword(password, ctx.user.password_hash);
  if (sameAsCurrent) {
    return {
      status: 'error',
      message: 'Одоогийн нууц үгээс өөр нууц үг оруулна уу.',
    };
  }

  const password_hash = await hashPassword(password);
  await updateUser(ctx.user.id, {
    password_hash,
    must_change_password: false,
  });

  redirect(getDefaultLandingPathForRole(ctx.user.role));
}
