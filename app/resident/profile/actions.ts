'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/permissions';
import {
  changeUserPasswordSchema,
  userProfileSchema,
} from '@/lib/auth/profile-schemas';
import { changeUserPassword, updateUserProfile } from '@/lib/auth/user-profile-service';

export type ResidentProfileActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function revalidateProfilePaths() {
  revalidatePath('/resident/profile');
  revalidatePath('/resident');
}

export async function updateResidentProfileAction(
  _prev: ResidentProfileActionState,
  formData: FormData,
): Promise<ResidentProfileActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const parsed = userProfileSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const updated = await updateUserProfile(ctx.user.id, parsed.data);
    if (!updated) return { status: 'error', message: 'Хэрэглэгч олдсонгүй' };
    revalidateProfilePaths();
    return { status: 'success', message: 'Профайл шинэчлэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function changeResidentPasswordAction(
  _prev: ResidentProfileActionState,
  formData: FormData,
): Promise<ResidentProfileActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const parsed = changeUserPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await changeUserPassword({
    userId: ctx.user.id,
    currentPassword: parsed.data.current_password,
    newPassword: parsed.data.new_password,
  });

  if (!result.ok) {
    return { status: 'error', message: result.message };
  }

  revalidateProfilePaths();
  return { status: 'success', message: 'Нууц үг амжилттай солигдлоо' };
}
