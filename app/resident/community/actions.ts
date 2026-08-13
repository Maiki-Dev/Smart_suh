'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/permissions';
import { castVoteSchema, proposalCommentSchema } from '@/lib/community/schemas';
import { submitProposalVote } from '@/lib/community/voting';
import { insertProposalComment } from '@/lib/queries/community';
import { getResidentByUserId } from '@/lib/queries/residents';
import { getProposalById } from '@/lib/queries/community';

export type ResidentCommunityActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function revalidateCommunity(proposalId?: string) {
  revalidatePath('/resident/community');
  revalidatePath('/resident');
  if (proposalId) revalidatePath(`/resident/community/${proposalId}`);
}

export async function castVoteAction(
  _prev: ResidentCommunityActionState,
  formData: FormData,
): Promise<ResidentCommunityActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const parsed = castVoteSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { status: 'error', message: 'Сонголт буруу байна' };
  }

  const result = await submitProposalVote({
    proposalId: parsed.data.proposal_id,
    userId: ctx.user.id,
    vote: parsed.data.vote,
  });

  if (!result.ok) return { status: 'error', message: result.message };
  revalidateCommunity(parsed.data.proposal_id);
  return { status: 'success', message: 'Санал амжилттай бүртгэгдлээ' };
}

export async function addProposalCommentAction(
  _prev: ResidentCommunityActionState,
  formData: FormData,
): Promise<ResidentCommunityActionState> {
  const ctx = await requireRole(['RESIDENT']);
  const parsed = proposalCommentSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { status: 'error', message: 'Сэтгэгдэл оруулна уу' };
  }

  const proposal = await getProposalById(parsed.data.proposal_id);
  if (!proposal) return { status: 'error', message: 'Санал олдсонгүй' };

  const resident = await getResidentByUserId(ctx.user.id);
  if (!resident) return { status: 'error', message: 'Оршин суугчийн мэдээлэл олдсонгүй' };

  await insertProposalComment({
    proposal_id: parsed.data.proposal_id,
    resident_id: resident.id,
    user_id: ctx.user.id,
    content: parsed.data.content,
  });

  revalidateCommunity(parsed.data.proposal_id);
  return { status: 'success', message: 'Сэтгэгдэл нэмэгдлээ' };
}
