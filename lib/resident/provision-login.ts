import 'server-only';
import { hashPassword } from '@/lib/auth/password';
import type { DbClient } from '@/lib/db';
import { createUser, getUserByEmail, updateUser } from '@/lib/queries/users';

export const DEFAULT_RESIDENT_PASSWORD =
  process.env.DEFAULT_RESIDENT_PASSWORD ?? 'resident123';

export async function createResidentLoginAccount(input: {
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  client?: DbClient;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const existing = await getUserByEmail(input.organization_id, email, input.client);
  if (existing) {
    throw new Error('Энэ и-мэйлээр нэвтрэх эрх бүртгэгдсэн байна');
  }

  const password_hash = await hashPassword(DEFAULT_RESIDENT_PASSWORD);
  const user = await createUser({
    organization_id: input.organization_id,
    email,
    password_hash,
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone ?? null,
    role: 'RESIDENT',
    status: 'ACTIVE',
    must_change_password: true,
    client: input.client,
  });
  return user.id;
}

export async function syncResidentLoginAccount(input: {
  user_id: string;
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const conflict = await getUserByEmail(input.organization_id, email);
  if (conflict && conflict.id !== input.user_id) {
    throw new Error('Энэ и-мэйлээр өөр нэвтрэх эрх бүртгэгдсэн байна');
  }

  await updateUser(input.user_id, {
    email,
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone ?? null,
  });
}
