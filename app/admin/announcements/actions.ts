'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/permissions';
import {
  assertOrganizationAccess,
  resolveOrganizationIdForCreate,
} from '@/lib/admin/org-scope';
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  updateAnnouncement,
} from '@/lib/queries/announcements';

export type AnnouncementActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const emptyToNull = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Гарчиг оруулна уу').max(255),
  content: z.string().trim().min(1, 'Агуулга оруулна уу').max(10000),
  image_url: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  attachment_url: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  expires_at: z.preprocess(emptyToNull, z.string().nullable().optional()),
  is_pinned: z.preprocess(
    (v) => v === 'on' || v === 'true' || v === true,
    z.boolean().optional(),
  ),
});

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function revalidateAnnouncementPaths() {
  revalidatePath('/admin/announcements');
  revalidatePath('/admin');
  revalidatePath('/resident');
}

export async function createAnnouncementAction(
  _prev: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  const ctx = await requireAdminRole();
  const organizationId = resolveOrganizationIdForCreate(ctx);
  const parsed = announcementSchema.safeParse(formToObject(formData));

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createAnnouncement({
      organization_id: organizationId,
      title: parsed.data.title,
      content: parsed.data.content,
      image_url: parsed.data.image_url ?? null,
      attachment_url: parsed.data.attachment_url ?? null,
      expires_at: parsed.data.expires_at ?? null,
      is_pinned: parsed.data.is_pinned ?? false,
      created_by: ctx.user.id,
    });

    revalidateAnnouncementPaths();
    return { status: 'success', message: 'Зарлал үүсгэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function updateAnnouncementAction(
  _prev: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  const ctx = await requireAdminRole();
  const id = String(formData.get('id') ?? '');
  const parsed = announcementSchema.safeParse(formToObject(formData));

  if (!id) return { status: 'error', message: 'Зарлал олдсонгүй' };
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await getAnnouncementById(id);
  if (!existing) return { status: 'error', message: 'Зарлал олдсонгүй' };
  assertOrganizationAccess(ctx, existing.organization_id);

  try {
    await updateAnnouncement(id, {
      title: parsed.data.title,
      content: parsed.data.content,
      image_url: parsed.data.image_url ?? null,
      attachment_url: parsed.data.attachment_url ?? null,
      expires_at: parsed.data.expires_at ?? null,
      is_pinned: parsed.data.is_pinned ?? existing.is_pinned,
    });

    revalidateAnnouncementPaths();
    return { status: 'success', message: 'Зарлал шинэчлэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function publishAnnouncementAction(id: string): Promise<AnnouncementActionState> {
  const ctx = await requireAdminRole();
  const existing = await getAnnouncementById(id);
  if (!existing) return { status: 'error', message: 'Зарлал олдсонгүй' };
  assertOrganizationAccess(ctx, existing.organization_id);

  try {
    await updateAnnouncement(id, {
      published_at: new Date().toISOString(),
    });
    revalidateAnnouncementPaths();
    return { status: 'success', message: 'Зарлал нийтлэгдлээ' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function unpublishAnnouncementAction(id: string): Promise<AnnouncementActionState> {
  const ctx = await requireAdminRole();
  const existing = await getAnnouncementById(id);
  if (!existing) return { status: 'error', message: 'Зарлал олдсонгүй' };
  assertOrganizationAccess(ctx, existing.organization_id);

  try {
    await updateAnnouncement(id, { published_at: null });
    revalidateAnnouncementPaths();
    return { status: 'success', message: 'Зарлал нийтлэлээс хасагдлаа' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function deleteAnnouncementAction(id: string): Promise<AnnouncementActionState> {
  const ctx = await requireAdminRole();
  const existing = await getAnnouncementById(id);
  if (!existing) return { status: 'error', message: 'Зарлал олдсонгүй' };
  assertOrganizationAccess(ctx, existing.organization_id);

  try {
    await deleteAnnouncement(id);
    revalidateAnnouncementPaths();
    return { status: 'success', message: 'Зарлал устгагдлаа' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function pinAnnouncementAction(
  id: string,
  pinned: boolean,
): Promise<AnnouncementActionState> {
  const ctx = await requireAdminRole();
  const existing = await getAnnouncementById(id);
  if (!existing) return { status: 'error', message: 'Зарлал олдсонгүй' };
  assertOrganizationAccess(ctx, existing.organization_id);

  try {
    await updateAnnouncement(id, { is_pinned: pinned });
    revalidateAnnouncementPaths();
    return {
      status: 'success',
      message: pinned ? 'Зарлал дээд талд бэхлэгдлээ' : 'Бэхлэлт арилгагдлаа',
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}
