import 'server-only';

import { withTransaction } from '@/lib/db';
import { createAuditLog } from '@/lib/queries/audit_logs';
import { createNotification } from '@/lib/queries/notifications';
import { createProposal, insertEligibleVoters, updateProposalStatus } from '@/lib/queries/community';
import { resolveEligibleResidents } from '@/lib/community/eligibility';
import { buildEligibilityRules, type CreateProposalInput } from '@/lib/community/schemas';
import type { CommunityProposal, ProposalStatus } from '@/types';

export async function createCommunityProposal(input: {
  organizationId: string;
  actorId: string;
  data: CreateProposalInput;
  publish?: boolean;
}): Promise<CommunityProposal> {
  const rules = buildEligibilityRules(input.data);
  const status: ProposalStatus = input.publish ? 'VOTING_OPEN' : 'DRAFT';

  const proposal = await withTransaction(async (client) => {
    const created = await createProposal(
      {
        organization_id: input.organizationId,
        building_id: input.data.building_id ?? null,
        title: input.data.title,
        description: input.data.description ?? null,
        category: input.data.category,
        status,
        estimated_budget: input.data.estimated_budget,
        funding_source: input.data.funding_source,
        reserve_fund_id: input.data.reserve_fund_id ?? null,
        voting_start_at: input.data.voting_start_at,
        voting_end_at: input.data.voting_end_at,
        approval_rule: input.data.approval_rule,
        quorum_percentage: input.data.quorum_percentage,
        approval_percentage: input.data.approval_percentage,
        voting_mode: input.data.voting_mode,
        vote_visibility: input.data.vote_visibility,
        allow_vote_change: input.data.allow_vote_change,
        eligibility_rules: {
          ...rules,
          contribution_method: input.data.contribution_method,
          contribution_due_date: input.data.contribution_due_date,
        },
        created_by: input.actorId,
      },
      client,
    );

    if (input.publish) {
      const eligible = await resolveEligibleResidents(
        input.organizationId,
        input.data.building_id ?? null,
        rules,
        input.data.voting_mode,
        client,
      );

      await insertEligibleVoters(
        created.id,
        eligible.map((e) => ({
          resident_id: e.resident_id,
          apartment_id: e.apartment_id,
          voting_weight: e.voting_weight,
        })),
        client,
      );

      for (const e of eligible) {
        if (!e.user_id) continue;
        await createNotification({
          organization_id: input.organizationId,
          user_id: e.user_id,
          type: 'COMMUNITY',
          title: '🗳 Шинэ санал гарлаа',
          message: `${input.data.title} — саналаа өгнө үү`,
          client,
        });
      }
    }

    await createAuditLog({
      organization_id: input.organizationId,
      actor_id: input.actorId,
      action: input.publish ? 'PROPOSAL_PUBLISHED' : 'PROPOSAL_CREATED',
      entity_type: 'community_proposal',
      entity_id: created.id,
      new_data: { title: input.data.title, status },
      client,
    });

    return created;
  });

  return proposal;
}

export async function publishProposal(
  proposalId: string,
  actorId: string,
): Promise<void> {
  await withTransaction(async (client) => {
    const { getProposalById } = await import('@/lib/queries/community');
    const proposal = await getProposalById(proposalId, client);
    if (!proposal) throw new Error('Санал олдсонгүй');
    if (proposal.status !== 'DRAFT') throw new Error('Зөвхөн ноорог санал нийтэлнэ');

    const eligible = await resolveEligibleResidents(
      proposal.organization_id,
      proposal.building_id,
      proposal.eligibility_rules,
      proposal.voting_mode,
      client,
    );

    await insertEligibleVoters(
      proposalId,
      eligible.map((e) => ({
        resident_id: e.resident_id,
        apartment_id: e.apartment_id,
        voting_weight: e.voting_weight,
      })),
      client,
    );

    await updateProposalStatus(proposalId, 'VOTING_OPEN', client);

    for (const e of eligible) {
      if (!e.user_id) continue;
      await createNotification({
        organization_id: proposal.organization_id,
        user_id: e.user_id,
        type: 'COMMUNITY',
        title: '🗳 Шинэ санал гарлаа',
        message: `${proposal.title} — саналаа өгнө үү`,
        client,
      });
    }

    await createAuditLog({
      organization_id: proposal.organization_id,
      actor_id: actorId,
      action: 'PROPOSAL_PUBLISHED',
      entity_type: 'community_proposal',
      entity_id: proposalId,
      client,
    });
  });
}

export async function cancelProposal(
  proposalId: string,
  actorId: string,
  reason?: string,
): Promise<void> {
  await withTransaction(async (client) => {
    const { getProposalById } = await import('@/lib/queries/community');
    const { releaseReservedFunds } = await import('@/lib/community/reserve-fund');
    const proposal = await getProposalById(proposalId, client);
    if (!proposal) throw new Error('Санал олдсонгүй');

    await releaseReservedFunds(
      { organizationId: proposal.organization_id, proposalId, actorId },
      client,
    );
    await updateProposalStatus(proposalId, 'CANCELLED', client);

    await createAuditLog({
      organization_id: proposal.organization_id,
      actor_id: actorId,
      action: 'PROPOSAL_CANCELLED',
      entity_type: 'community_proposal',
      entity_id: proposalId,
      new_data: { reason },
      client,
    });
  });
}

export async function emergencyApproveProposal(
  proposalId: string,
  actorId: string,
): Promise<void> {
  await withTransaction(async (client) => {
    const { getProposalById } = await import('@/lib/queries/community');
    const { processApprovedProposal } = await import('@/lib/community/budget-engine');
    const proposal = await getProposalById(proposalId, client);
    if (!proposal) throw new Error('Санал олдсонгүй');

    await client.query(
      `
        UPDATE community_proposals
           SET status = 'APPROVED'::proposal_status,
               emergency_approved = TRUE,
               emergency_approved_by = $1,
               emergency_approved_at = NOW(),
               result_decided_at = NOW()
         WHERE id = $2
      `,
      [actorId, proposalId],
    );

    await createAuditLog({
      organization_id: proposal.organization_id,
      actor_id: actorId,
      action: 'PROPOSAL_EMERGENCY_APPROVED',
      entity_type: 'community_proposal',
      entity_id: proposalId,
      client,
    });

    await processApprovedProposal(proposalId, actorId, client);
  });
}

export async function startProject(
  projectId: string,
  actorId: string,
): Promise<void> {
  await withTransaction(async (client) => {
    const { rows } = await client.query<{ proposal_id: string; organization_id: string }>(
      `SELECT proposal_id, organization_id FROM community_projects WHERE id = $1`,
      [projectId],
    );
    const project = rows[0];
    if (!project) throw new Error('Төсөл олдсонгүй');

    await client.query(
      `
        UPDATE community_projects
           SET status = 'IN_PROGRESS', started_at = NOW()
         WHERE id = $1
      `,
      [projectId],
    );
    await updateProposalStatus(project.proposal_id, 'IN_PROGRESS', client);

    await createAuditLog({
      organization_id: project.organization_id,
      actor_id: actorId,
      action: 'PROJECT_STARTED',
      entity_type: 'community_project',
      entity_id: projectId,
      client,
    });
  });
}

export async function addProjectExpense(input: {
  projectId: string;
  actorId: string;
  amount: number;
  description: string;
  supplier?: string | null;
  receiptUrl?: string | null;
  expenseDate?: string | null;
}): Promise<void> {
  await withTransaction(async (client) => {
    const { rows } = await client.query<{
      id: string;
      proposal_id: string;
      organization_id: string;
      approved_budget: string;
      actual_spent: string;
    }>(
      `SELECT id, proposal_id, organization_id, approved_budget, actual_spent FROM community_projects WHERE id = $1`,
      [input.projectId],
    );
    const project = rows[0];
    if (!project) throw new Error('Төсөл олдсонгүй');

    const newSpent = parseFloat(project.actual_spent) + input.amount;
    const approved = parseFloat(project.approved_budget);

    await client.query(
      `
        INSERT INTO project_expenses
          (project_id, amount, description, supplier, receipt_url, expense_date, created_by)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
      `,
      [
        input.projectId,
        input.amount,
        input.description,
        input.supplier ?? null,
        input.receiptUrl ?? null,
        input.expenseDate ?? null,
        input.actorId,
      ],
    );

    const progress = approved > 0 ? Math.min(100, (newSpent / approved) * 100) : 0;

    await client.query(
      `
        UPDATE community_projects
           SET actual_spent = $1, progress_percentage = $2
         WHERE id = $3
      `,
      [newSpent, progress, input.projectId],
    );

    const { spendReservedFunds } = await import('@/lib/community/reserve-fund');
    try {
      await spendReservedFunds(
        {
          organizationId: project.organization_id,
          proposalId: project.proposal_id,
          projectId: input.projectId,
          amount: input.amount,
          actorId: input.actorId,
        },
        client,
      );
    } catch {
      // Reserve may be partially used; expense still recorded
    }

    await createAuditLog({
      organization_id: project.organization_id,
      actor_id: input.actorId,
      action: 'PROJECT_EXPENSE_ADDED',
      entity_type: 'community_project',
      entity_id: input.projectId,
      new_data: { amount: input.amount, description: input.description, over_budget: newSpent > approved },
      client,
    });
  });
}

export async function completeProject(projectId: string, actorId: string): Promise<void> {
  await withTransaction(async (client) => {
    const { rows } = await client.query<{ proposal_id: string; organization_id: string; title: string }>(
      `
        SELECT cp.proposal_id, cp.organization_id, p.title
          FROM community_projects cp
          JOIN community_proposals p ON cp.proposal_id = p.id
         WHERE cp.id = $1
      `,
      [projectId],
    );
    const project = rows[0];
    if (!project) throw new Error('Төсөл олдсонгүй');

    await client.query(
      `UPDATE community_projects SET status = 'COMPLETED', completed_at = NOW(), progress_percentage = 100 WHERE id = $1`,
      [projectId],
    );
    await updateProposalStatus(project.proposal_id, 'COMPLETED', client);

    const eligible = await resolveEligibleResidents(
      project.organization_id,
      null,
      { scope: 'ENTIRE_BUILDING' },
      'ONE_RESIDENT_ONE_VOTE',
      client,
    );

    for (const e of eligible) {
      if (!e.user_id) continue;
      await createNotification({
        organization_id: project.organization_id,
        user_id: e.user_id,
        type: 'COMMUNITY',
        title: '✅ Төсөл дууслаа',
        message: project.title,
        client,
      });
    }

    await createAuditLog({
      organization_id: project.organization_id,
      actor_id: actorId,
      action: 'PROJECT_COMPLETED',
      entity_type: 'community_project',
      entity_id: projectId,
      client,
    });
  });
}
