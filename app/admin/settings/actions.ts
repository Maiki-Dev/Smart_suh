'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { mergeOrganizationSettings, parseOrganizationSettings } from '@/lib/organization/settings';
import { getOrganizationById, updateOrganization } from '@/lib/queries/organizations';
import { getUserById, updateUser } from '@/lib/queries/users';

export type SettingsActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const emptyToNull = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function canManageOrganization(role: string): boolean {
  return role === 'HOA_ADMIN' || role === 'SUPER_ADMIN';
}

function revalidateSettingsPaths() {
  revalidatePath('/admin/settings');
  revalidatePath('/admin');
}

const organizationProfileSchema = z.object({
  name: z.string().trim().min(1, 'Нэр оруулна уу').max(255),
  registration_number: z.preprocess(emptyToNull, z.string().max(64).nullable().optional()),
  address: z.preprocess(emptyToNull, z.string().max(500).nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().max(32).nullable().optional()),
  email: z.preprocess(
    emptyToNull,
    z.string().email('И-мэйл хаяг буруу байна').nullable().optional(),
  ),
  logo_url: z.preprocess(emptyToNull, z.string().url('URL буруу байна').nullable().optional()),
});

const organizationSettingsSchema = z.object({
  timezone: z.string().trim().min(1),
  currency: z.string().trim().min(1),
  language: z.string().trim().min(1),
  gate_unpaid_months: z.coerce.number().int().min(1).max(12),
  invoice_due_days: z.coerce.number().int().min(1).max(60),
  visitor_default_hours: z.coerce.number().int().min(1).max(168),
});

const profileSchema = z.object({
  first_name: z.string().trim().min(1, 'Нэр оруулна уу').max(100),
  last_name: z.string().trim().min(1, 'Овог оруулна уу').max(100),
  phone: z.preprocess(emptyToNull, z.string().max(32).nullable().optional()),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Одоогийн нууц үг оруулна уу'),
    new_password: z.string().min(6, 'Шинэ нууц үг хамгийн багадаа 6 тэмдэгт'),
    confirm_password: z.string().min(1, 'Нууц үг давтан оруулна уу'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Нууц үг таарахгүй байна',
    path: ['confirm_password'],
  });

export async function updateOrganizationProfileAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const ctx = await requireAdminRole();
  if (!canManageOrganization(ctx.user.role)) {
    return { status: 'error', message: 'Энэ тохиргоог засах эрхгүй байна' };
  }

  const organizationId = ctx.user.organization_id;
  const parsed = organizationProfileSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await getOrganizationById(organizationId);
  if (!existing) return { status: 'error', message: 'Байгууллага олдсонгүй' };
  assertOrganizationAccess(ctx, existing.id);

  try {
    await updateOrganization(organizationId, {
      name: parsed.data.name,
      registration_number: parsed.data.registration_number ?? null,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      logo_url: parsed.data.logo_url ?? null,
    });
    revalidateSettingsPaths();
    return { status: 'success', message: 'Байгууллагын мэдээлэл хадгалагдлаа' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function updateOrganizationSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const ctx = await requireAdminRole();
  if (!canManageOrganization(ctx.user.role)) {
    return { status: 'error', message: 'Энэ тохиргоог засах эрхгүй байна' };
  }

  const organizationId = ctx.user.organization_id;
  const parsed = organizationSettingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await getOrganizationById(organizationId);
  if (!existing) return { status: 'error', message: 'Байгууллага олдсонгүй' };
  assertOrganizationAccess(ctx, existing.id);

  try {
    await updateOrganization(organizationId, {
      settings: mergeOrganizationSettings(existing.settings, parsed.data),
    });
    revalidateSettingsPaths();
    return { status: 'success', message: 'Системийн тохиргоо хадгалагдлаа' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function updateProfileAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const ctx = await requireAdminRole();
  const parsed = profileSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const updated = await updateUser(ctx.user.id, {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone ?? null,
    });
    if (!updated) return { status: 'error', message: 'Хэрэглэгч олдсонгүй' };
    revalidateSettingsPaths();
    return { status: 'success', message: 'Профайл шинэчлэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function changePasswordAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const ctx = await requireAdminRole();
  const parsed = passwordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await getUserById(ctx.user.id);
  if (!user) return { status: 'error', message: 'Хэрэглэгч олдсонгүй' };

  const valid = await verifyPassword(parsed.data.current_password, user.password_hash);
  if (!valid) {
    return { status: 'error', message: 'Одоогийн нууц үг буруу байна' };
  }

  try {
    const password_hash = await hashPassword(parsed.data.new_password);
    await updateUser(ctx.user.id, { password_hash });
    revalidateSettingsPaths();
    return { status: 'success', message: 'Нууц үг амжилттай солигдлоо' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export type SettingsPageData = {
  organization: NonNullable<Awaited<ReturnType<typeof getOrganizationById>>>;
  settings: ReturnType<typeof parseOrganizationSettings>;
};

export async function loadSettingsPageData(organizationId: string): Promise<SettingsPageData | null> {
  const organization = await getOrganizationById(organizationId);
  if (!organization) return null;
  return {
    organization,
    settings: parseOrganizationSettings(organization.settings),
  };
}
