'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/permissions';
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/queries/notifications';

export type ResidentNotificationActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const markReadSchema = z.object({
  id: z.string().uuid(),
});

export async function markReadAction(
  _prev: ResidentNotificationActionState,
  formData: FormData,
): Promise<ResidentNotificationActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const parsed = markReadSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { status: 'error', message: 'Мэдээлэл буруу байна' };
  }

  const ok = await markNotificationRead(parsed.data.id, ctx.user.id);
  if (!ok) return { status: 'error', message: 'Мэдэгдэл олдсонгүй' };

  revalidatePath('/resident/notifications');
  revalidatePath('/resident');
  return { status: 'success', message: 'Уншсан гэж тэмдэглэгдлээ' };
}

export async function markAllReadAction(): Promise<ResidentNotificationActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const count = await markAllNotificationsRead(ctx.user.id);

  revalidatePath('/resident/notifications');
  revalidatePath('/resident');
  return {
    status: 'success',
    message: count > 0 ? `${count} мэдэгдэл уншсан боллоо` : 'Уншаагүй мэдэгдэл байхгүй',
  };
}
