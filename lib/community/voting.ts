import 'server-only';

import { withTransaction, type DbClient } from '@/lib/db';
import { createAuditLog } from '@/lib/queries/audit_logs';
import { createNotification } from '@/lib/queries/notifications';
import type {
  CommunityProposal,
  ProposalApprovalRule,
  ProposalStatus,
  ProposalVoteChoice,
} from '@/types';
import {
  getProposalById,
  updateProposalStatus,
  listEligibleVoters,
  listVotesForProposal,
  upsertVote,
  getEligibleVoter,
} from '@/lib/queries/community';
import { getResidentByUserId } from '@/lib/queries/residents';
import { processApprovedProposal } from '@/lib/community/budget-engine';

export interface VoteResult {
  approved: boolean;
  status: ProposalStatus;
  yesWeight: number;
  noWeight: number;
  abstainWeight: number;
  participationPct: number;
  reason: string;
}

export function calculateVoteResult(
  proposal: Pick<
    CommunityProposal,
    'approval_rule' | 'quorum_percentage' | 'approval_percentage'
  >,
  eligibleTotalWeight: number,
  votes: Array<{ vote: ProposalVoteChoice; weight: number }>,
): VoteResult {
  let yesWeight = 0;
  let noWeight = 0;
  let abstainWeight = 0;

  for (const v of votes) {
    if (v.vote === 'YES') yesWeight += v.weight;
    else if (v.vote === 'NO') noWeight += v.weight;
    else abstainWeight += v.weight;
  }

  const votedWeight = yesWeight + noWeight + abstainWeight;
  const participationPct =
    eligibleTotalWeight > 0 ? (votedWeight / eligibleTotalWeight) * 100 : 0;

  const decidingVotes = yesWeight + noWeight;

  if (proposal.approval_rule === 'ADMIN_DECISION') {
    return {
      approved: false,
      status: 'VOTING_CLOSED',
      yesWeight,
      noWeight,
      abstainWeight,
      participationPct,
      reason: 'Админ шийдвэр шаардлагатай',
    };
  }

  if (proposal.approval_rule === 'QUORUM_REQUIRED') {
    if (participationPct < proposal.quorum_percentage) {
      return {
        approved: false,
        status: 'NO_QUORUM',
        yesWeight,
        noWeight,
        abstainWeight,
        participationPct,
        reason: `Quorum хүрээгүй (${participationPct.toFixed(1)}% < ${proposal.quorum_percentage}%)`,
      };
    }
  }

  let approved = false;
  let reason = '';

  switch (proposal.approval_rule as ProposalApprovalRule) {
    case 'SIMPLE_MAJORITY':
      approved = yesWeight > noWeight;
      reason = approved ? 'YES > NO' : 'YES ≤ NO';
      break;
    case 'QUALIFIED_MAJORITY':
    case 'CUSTOM':
    case 'QUORUM_REQUIRED': {
      const yesPct = decidingVotes > 0 ? (yesWeight / decidingVotes) * 100 : 0;
      approved = yesPct >= proposal.approval_percentage && yesWeight > noWeight;
      reason = approved
        ? `YES ${yesPct.toFixed(1)}% ≥ ${proposal.approval_percentage}%`
        : `YES ${yesPct.toFixed(1)}% < ${proposal.approval_percentage}%`;
      break;
    }
    default:
      approved = yesWeight > noWeight;
      reason = 'Default majority';
  }

  return {
    approved,
    status: approved ? 'APPROVED' : 'REJECTED',
    yesWeight,
    noWeight,
    abstainWeight,
    participationPct,
    reason,
  };
}

export async function submitProposalVote(input: {
  proposalId: string;
  userId: string;
  vote: ProposalVoteChoice;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const proposal = await getProposalById(input.proposalId);
  if (!proposal) return { ok: false, message: 'Санал олдсонгүй' };
  if (proposal.status !== 'VOTING_OPEN') {
    return { ok: false, message: 'Санал хураалт идэвхгүй байна' };
  }

  const now = new Date();
  if (proposal.voting_end_at && new Date(proposal.voting_end_at) < now) {
    return { ok: false, message: 'Санал хураалтын хугацаа дууссан' };
  }
  if (proposal.voting_start_at && new Date(proposal.voting_start_at) > now) {
    return { ok: false, message: 'Санал хураалт эхлээгүй байна' };
  }

  const resident = await getResidentByUserId(input.userId);
  if (!resident || resident.organization_id !== proposal.organization_id) {
    return { ok: false, message: 'Санал өгөх эрхгүй' };
  }

  const eligible = await getEligibleVoter(input.proposalId, resident.id);
  if (!eligible) return { ok: false, message: 'Энэ саналд оролцох эрхгүй' };

  const existingVotes = await listVotesForProposal(input.proposalId);
  const existing = existingVotes.find((v) => v.resident_id === resident.id);

  if (existing && !proposal.allow_vote_change) {
    return { ok: false, message: 'Саналаа өөрчлөх боломжгүй' };
  }

  if (proposal.voting_mode === 'ONE_APARTMENT_ONE_VOTE') {
    const aptVote = existingVotes.find(
      (v) => v.apartment_id === resident.apartment_id && v.resident_id !== resident.id,
    );
    if (aptVote && !existing) {
      return { ok: false, message: 'Энэ орон сууцын санал аль хэдийн өгсөн' };
    }
  }

  try {
    await withTransaction(async (client) => {
      await upsertVote(
        {
          proposal_id: input.proposalId,
          resident_id: resident.id,
          apartment_id: resident.apartment_id,
          vote: input.vote,
          weight: eligible.voting_weight,
        },
        client,
      );

      await createAuditLog({
        organization_id: proposal.organization_id,
        actor_id: input.userId,
        action: existing ? 'VOTE_CHANGED' : 'VOTE_SUBMITTED',
        entity_type: 'community_proposal',
        entity_id: proposal.id,
        old_data: existing ? { vote: existing.vote } : null,
        new_data: { vote: input.vote, weight: eligible.voting_weight },
        client,
      });
    });
    return { ok: true };
  } catch {
    return { ok: false, message: 'Санал бүртгэхэд алдаа гарлаа' };
  }
}

export async function closeProposalVoting(
  proposalId: string,
  actorId?: string | null,
  client?: DbClient,
): Promise<VoteResult> {
  const run = async (db: DbClient) => {
    const proposal = await getProposalById(proposalId, db);
    if (!proposal) throw new Error('Санал олдсонгүй');
    if (!['VOTING_OPEN', 'PUBLISHED'].includes(proposal.status)) {
      throw new Error('Санал хураалт хаагдсан эсвэл дууссан');
    }

    await updateProposalStatus(proposalId, 'VOTING_CLOSED', db);

    const eligible = await listEligibleVoters(proposalId, db);
    const eligibleTotalWeight = eligible.reduce((s, e) => s + e.voting_weight, 0);
    const votes = await listVotesForProposal(proposalId, db);

    const result = calculateVoteResult(proposal, eligibleTotalWeight, votes);

    await db.query(
      `
        UPDATE community_proposals
           SET status = $1::proposal_status,
               result_yes_weight = $2,
               result_no_weight = $3,
               result_abstain_weight = $4,
               result_participation_pct = $5,
               result_decided_at = NOW()
         WHERE id = $6
      `,
      [
        result.status,
        result.yesWeight,
        result.noWeight,
        result.abstainWeight,
        result.participationPct,
        proposalId,
      ],
    );

    await createAuditLog({
      organization_id: proposal.organization_id,
      actor_id: actorId,
      action: 'VOTING_CLOSED',
      entity_type: 'community_proposal',
      entity_id: proposalId,
      new_data: {
        status: result.status,
        approved: result.approved,
        reason: result.reason,
        yes: result.yesWeight,
        no: result.noWeight,
        abstain: result.abstainWeight,
        participation_pct: result.participationPct,
      },
      client: db,
    });

    const eligibleUsers = eligible.filter((e) => e.user_id);
    for (const ev of eligibleUsers) {
      if (!ev.user_id) continue;
      await createNotification({
        organization_id: proposal.organization_id,
        user_id: ev.user_id,
        type: 'COMMUNITY',
        title: '🗳 Санал хураалтын дүн',
        message: `${proposal.title}: ${result.status === 'APPROVED' ? 'Батлагдлаа' : result.status === 'NO_QUORUM' ? 'Quorum хүрээгүй' : 'Татгалзсан'}`,
        client: db,
      });
    }

    if (result.approved) {
      await processApprovedProposal(proposalId, actorId, db);
    }

    return result;
  };

  if (client) return run(client);
  return withTransaction(run);
}

export async function closeExpiredVotings(): Promise<number> {
  const { query } = await import('@/lib/db');
  const { rows } = await query<{ id: string }>(
    `
      SELECT id FROM community_proposals
       WHERE status = 'VOTING_OPEN'
         AND voting_end_at IS NOT NULL
         AND voting_end_at <= NOW()
       FOR UPDATE SKIP LOCKED
    `,
  );

  let closed = 0;
  for (const row of rows) {
    try {
      await closeProposalVoting(row.id, null);
      closed++;
    } catch (err) {
      console.error('Failed to close voting', row.id, err);
    }
  }
  return closed;
}

export async function sendVotingReminders(): Promise<number> {
  const { query } = await import('@/lib/db');
  const { rows } = await query<{ id: string; organization_id: string; title: string }>(
    `
      SELECT id, organization_id, title FROM community_proposals
       WHERE status = 'VOTING_OPEN'
         AND voting_end_at IS NOT NULL
         AND voting_end_at > NOW()
         AND voting_end_at <= NOW() + INTERVAL '24 hours'
    `,
  );

  let sent = 0;
  for (const proposal of rows) {
    const eligible = await listEligibleVoters(proposal.id);
    const votes = await listVotesForProposal(proposal.id);
    const votedResidents = new Set(votes.map((v) => v.resident_id));

    for (const ev of eligible) {
      if (!ev.user_id || votedResidents.has(ev.resident_id)) continue;
      await createNotification({
        organization_id: proposal.organization_id,
        user_id: ev.user_id,
        type: 'COMMUNITY',
        title: '⏰ Санал хураалт удахгүй дуусна',
        message: `${proposal.title} — 24 цагийн дотор саналаа өгнө үү`,
      });
      sent++;
    }
  }
  return sent;
}
