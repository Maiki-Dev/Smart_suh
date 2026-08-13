'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authenticateByCredentials, logoutCurrent } from '@/lib/auth/session';
import { getDefaultLandingPathForRole } from '@/lib/permissions';

const loginSchema = z.object({
  email: z.string().email({ message: 'И-мэйл хаяг буруу байна' }),
  password: z.string().min(6, { message: 'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой' }),
});

export type LoginActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const from = (formData.get('from') as string) || '';

  const validated = loginSchema.safeParse({ email, password });
  if (!validated.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл оруулна уу',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  let result;
  try {
    result = await authenticateByCredentials({
      email: validated.data.email,
      password: validated.data.password,
    });
  } catch (error) {
    console.error('Login failed due to database error', error);
    return {
      status: 'error',
      message: 'Системийн алдаа гарлаа. .env.local дотор NEXT_PUBLIC_SUPABASE_URL болон SUPABASE_DB_PASSWORD зөв эсэхийг шалгана уу.',
    };
  }

  if (!result.ok) {
    switch (result.reason) {
      case 'USER_INACTIVE':
        return {
          status: 'error',
          message: 'Хэрэглэгчийн эрх идэвхгүй байна. Администратартай холбогдоно уу.',
        };
      case 'ORG_MISMATCH':
        return {
          status: 'error',
          message: 'Байгууллага олдсонгүй.',
        };
      case 'INVALID_CREDENTIALS':
      default:
        return {
          status: 'error',
          message: 'И-мэйл эсвэл нууц үг буруу байна',
        };
    }
  }

  const landing = getDefaultLandingPathForRole(result.user.role);
  const redirectTo =
    result.user.must_change_password
      ? '/change-password'
      : from && from.startsWith('/') && from !== '/change-password'
        ? from
        : landing;
  redirect(redirectTo);
}

export async function logoutAction(): Promise<void> {
  await logoutCurrent();
  redirect('/login');
}
