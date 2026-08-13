import 'server-only';

import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { DEFAULT_RESIDENT_PASSWORD } from '@/lib/resident/provision-login';
import { getResidentByUserId, updateResident } from '@/lib/queries/residents';
import { getUserById, updateUser } from '@/lib/queries/users';
import type { User } from '@/types';
import type { UserProfileInput } from '@/lib/auth/profile-schemas';

export async function updateUserProfile(
  userId: string,
  input: UserProfileInput,
): Promise<User | null> {
  const updated = await updateUser(userId, {
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone ?? null,
  });
  if (!updated) return null;

  const resident = await getResidentByUserId(userId);
  if (resident) {
    await updateResident(resident.id, {
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone ?? null,
    });
  }

  return updated;
}

export async function changeUserPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await getUserById(input.userId);
  if (!user) return { ok: false, message: 'Хэрэглэгч олдсонгүй' };

  const valid = await verifyPassword(input.currentPassword, user.password_hash);
  if (!valid) {
    return { ok: false, message: 'Одоогийн нууц үг буруу байна' };
  }

  if (input.newPassword === DEFAULT_RESIDENT_PASSWORD) {
    return {
      ok: false,
      message: 'Анхны нууц үгийг дахин ашиглах боломжгүй. Өөр нууц үг сонгоно уу.',
    };
  }

  const sameAsCurrent = await verifyPassword(input.newPassword, user.password_hash);
  if (sameAsCurrent) {
    return { ok: false, message: 'Одоогийн нууц үгээс өөр нууц үг оруулна уу.' };
  }

  const password_hash = await hashPassword(input.newPassword);
  await updateUser(user.id, {
    password_hash,
    must_change_password: false,
  });

  return { ok: true };
}
