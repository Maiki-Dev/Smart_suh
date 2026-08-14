'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authenticateByCredentials, logoutCurrent } from '@/lib/auth/session';
import { getDefaultLandingPathForRole } from '@/lib/permissions';

const identifierSchema = z.string().min(3, { message: 'И-мэйл эсвэл утасны дугаараа оруулна уу' }).superRefine((val, ctx) => {
  const trimmed = val.trim();
  if (!trimmed) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'И-мэйл эсвэл утасны дугаараа оруулна уу' });
    return;
  }
  if (trimmed.includes('@')) {
    const r = z.string().email({ message: 'И-мэйл хаяг буруу байна' }).safeParse(trimmed);
    if (!r.success) {
      r.error.issues.forEach((i) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: i.message,
        });
      });
    }
    return;
  }
  const digits = trimmed.replace(/\D/g, '');
  const normalized = digits.startsWith('976') ? digits.slice(3) : digits;
  if (normalized.length < 7 || normalized.length > 15) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Утасны дугаар буруу байна. Жишээ: 99112233 эсвэл +97699112233',
    });
  }
});

const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(6, { message: 'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой' }),
});

export type LoginActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  fieldErrors?: {
    identifier?: string[];
    password?: string[];
  };
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const identifier = formData.get('identifier') as string;
  const password = formData.get('password') as string;
  const from = (formData.get('from') as string) || '';

  const validated = loginSchema.safeParse({ identifier, password });
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
      email: validated.data.identifier,
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
          message: 'И-мэйл/утасны дугаар эсвэл нууц үг буруу байна',
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
