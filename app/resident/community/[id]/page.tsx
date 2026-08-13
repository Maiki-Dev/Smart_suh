import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/permissions';
import { ResidentShell } from '@/components/layout/ResidentShell';
import { ResidentProposalDetail } from '@/components/resident/ResidentCommunityPanel';
import { getResidentOverviewStats } from '@/lib/queries/dashboard';
import { getResidentByUserId } from '@/lib/queries/residents';
import {
  getProposalById,
  getEligibleVoter,
  getVoteByResident,
  listProposalComments,
  listVotesForProposal,
} from '@/lib/queries/community';
import { getOrCreateReserveFund } from '@/lib/community/reserve-fund';

export default async function ResidentCommunityProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireRole(['RESIDENT']);
  const [overview, resident, proposal] = await Promise.all([
    getResidentOverviewStats(ctx.user.organization_id, ctx.user.id),
    getResidentByUserId(ctx.user.id),
    getProposalById(id),
  ]);

  if (!proposal || proposal.organization_id !== ctx.user.organization_id) notFound();
  if (proposal.status === 'DRAFT') notFound();

  const apartmentLabel = overview.apartment
    ? [overview.apartment.tower, overview.apartment.apartment_number].filter(Boolean).join(' · ')
    : '—';

  const [reserveFund, eligible, myVote, comments, votes] = await Promise.all([
    getOrCreateReserveFund(proposal.organization_id),
    resident ? getEligibleVoter(id, resident.id) : null,
    resident ? getVoteByResident(id, resident.id) : null,
    listProposalComments(id),
    listVotesForProposal(id),
  ]);

  const now = new Date();
  const canVote =
    proposal.status === 'VOTING_OPEN' &&
    !!eligible &&
    (!proposal.voting_end_at || new Date(proposal.voting_end_at) > now) &&
    (!proposal.voting_start_at || new Date(proposal.voting_start_at) <= now) &&
    (!myVote || proposal.allow_vote_change);

  const voteSummary = votes.reduce(
    (acc, v) => {
      if (v.vote === 'YES') acc.yes += v.weight;
      else if (v.vote === 'NO') acc.no += v.weight;
      else acc.abstain += v.weight;
      acc.total += v.weight;
      return acc;
    },
    { yes: 0, no: 0, abstain: 0, total: 0 },
  );

  return (
      <ResidentShell
        ctx={ctx}
        apartmentLabel={apartmentLabel}
        unreadNotifications={overview.unread_notifications}
        activeSegment="community"
        pageTitle="Санал"
        pageSubtitle={proposal.title}
      >
        <ResidentProposalDetail
          proposal={proposal}
          reserveFund={reserveFund}
          myVote={myVote}
          isEligible={!!eligible}
          canVote={canVote}
          comments={comments as Array<{ id: string; content: string; first_name?: string; last_name?: string; apartment_number?: string; is_pinned: boolean; created_at: string }>}
          voteSummary={voteSummary}
        />
      </ResidentShell>
  );
}
