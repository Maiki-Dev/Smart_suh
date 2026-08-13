'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess, getScopedOrganizationId } from '@/lib/admin/org-scope';
import {
  createProposalSchema,
  projectExpenseSchema,
  projectUpdateSchema,
  reserveFundDepositSchema,
} from '@/lib/community/schemas';
import {
  createCommunityProposal,
  publishProposal,
  cancelProposal,
  emergencyApproveProposal,
  startProject,
  addProjectExpense,
  completeProject,
} from '@/lib/community/proposal-service';
import { closeProposalVoting } from '@/lib/community/voting';
import { depositReserveFund } from '@/lib/community/reserve-fund';
import { getProposalById, getProjectByProposal } from '@/lib/queries/community';
import { query } from '@/lib/db';

export type CommunityActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  proposalId?: string;
};

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function revalidateCommunity() {
  revalidatePath('/admin/community');
  revalidatePath('/resident/community');
  revalidatePath('/resident');
}

export async function createProposalAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  const orgId = getScopedOrganizationId(ctx) ?? ctx.user.organization_id;
  assertOrganizationAccess(ctx, orgId);

  const parsed = createProposalSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Мэдээлэл буруу байна',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const publish = formData.get('publish') === 'true';
    const proposal = await createCommunityProposal({
      organizationId: orgId,
      actorId: ctx.user.id,
      data: parsed.data,
      publish,
    });
    revalidateCommunity();
    return {
      status: 'success',
      message: publish ? 'Санал нийтэлж, санал хураалт эхэллээ' : 'Санал хадгалагдлаа',
      proposalId: proposal.id,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Алдаа гарлаа',
    };
  }
}

export async function publishProposalAction(proposalId: string): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  const proposal = await getProposalById(proposalId);
  if (!proposal) return { status: 'error', message: 'Санал олдсонгүй' };
  assertOrganizationAccess(ctx, proposal.organization_id);

  try {
    await publishProposal(proposalId, ctx.user.id);
    revalidateCommunity();
    return { status: 'success', message: 'Санал нийтлэгдлээ' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Алдаа гарлаа' };
  }
}

export async function closeVotingAction(proposalId: string): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  const proposal = await getProposalById(proposalId);
  if (!proposal) return { status: 'error', message: 'Санал олдсонгүй' };
  assertOrganizationAccess(ctx, proposal.organization_id);

  try {
    const result = await closeProposalVoting(proposalId, ctx.user.id);
    revalidateCommunity();
    return {
      status: 'success',
      message: `Санал хаагдлаа: ${result.status} (${result.reason})`,
    };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Алдаа гарлаа' };
  }
}

export async function cancelProposalAction(proposalId: string): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  const proposal = await getProposalById(proposalId);
  if (!proposal) return { status: 'error', message: 'Санал олдсонгүй' };
  assertOrganizationAccess(ctx, proposal.organization_id);

  try {
    await cancelProposal(proposalId, ctx.user.id);
    revalidateCommunity();
    return { status: 'success', message: 'Санал цуцлагдлаа' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Алдаа гарлаа' };
  }
}

export async function emergencyApproveAction(proposalId: string): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  const proposal = await getProposalById(proposalId);
  if (!proposal) return { status: 'error', message: 'Санал олдсонгүй' };
  assertOrganizationAccess(ctx, proposal.organization_id);

  try {
    await emergencyApproveProposal(proposalId, ctx.user.id);
    revalidateCommunity();
    return { status: 'success', message: 'Яаралтай батлагдлаа' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Алдаа гарлаа' };
  }
}

export async function depositReserveFundAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  const orgId = getScopedOrganizationId(ctx) ?? ctx.user.organization_id;
  const parsed = reserveFundDepositSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { status: 'error', message: 'Дүн буруу байна' };
  }

  try {
    await depositReserveFund({
      organizationId: orgId,
      amount: parsed.data.amount,
      description: parsed.data.description,
      actorId: ctx.user.id,
    });
    revalidateCommunity();
    return { status: 'success', message: 'Нөөц санд орлого бүртгэгдлээ' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Алдаа гарлаа' };
  }
}

export async function addProjectExpenseAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  const parsed = projectExpenseSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { status: 'error', message: 'Мэдээлэл буруу байна' };
  }

  try {
    await addProjectExpense({
      projectId: parsed.data.project_id,
      actorId: ctx.user.id,
      amount: parsed.data.amount,
      description: parsed.data.description,
      supplier: parsed.data.supplier,
      receiptUrl: parsed.data.receipt_url,
      expenseDate: parsed.data.expense_date,
    });
    revalidateCommunity();
    return { status: 'success', message: 'Зардал бүртгэгдлээ' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Алдаа гарлаа' };
  }
}

export async function startProjectAction(proposalId: string): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  const project = await getProjectByProposal(proposalId);
  if (!project) return { status: 'error', message: 'Төсөл олдсонгүй' };

  try {
    await startProject(project.id, ctx.user.id);
    revalidateCommunity();
    return { status: 'success', message: 'Төсөл эхэллээ' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Алдаа гарлаа' };
  }
}

export async function completeProjectAction(proposalId: string): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  const project = await getProjectByProposal(proposalId);
  if (!project) return { status: 'error', message: 'Төсөл олдсонгүй' };

  try {
    await completeProject(project.id, ctx.user.id);
    revalidateCommunity();
    return { status: 'success', message: 'Төсөл дууслаа' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Алдаа гарлаа' };
  }
}

export async function addProjectUpdateAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  const parsed = projectUpdateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { status: 'error', message: 'Мэдээлэл буруу байна' };

  try {
    await query(
      `INSERT INTO project_updates (project_id, title, content, created_by) VALUES ($1, $2, $3, $4)`,
      [parsed.data.project_id, parsed.data.title, parsed.data.content, ctx.user.id],
    );
    revalidateCommunity();
    return { status: 'success', message: 'Шинэчлэл нэмэгдлээ' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Алдаа гарлаа' };
  }
}

export async function hideCommentAction(commentId: string): Promise<CommunityActionState> {
  const ctx = await requireAdminRole();
  await query(`UPDATE proposal_comments SET status = 'HIDDEN' WHERE id = $1`, [commentId]);
  revalidateCommunity();
  return { status: 'success', message: 'Сэтгэгдэл нуугдлаа' };
}
