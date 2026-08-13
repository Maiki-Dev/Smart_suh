import { notFound } from 'next/navigation';
import { requireAdminRole } from '@/lib/permissions';
import { assertOrganizationAccess } from '@/lib/admin/org-scope';
import { AdminShell } from '@/components/layout/AdminShell';
import { CommunityProposalDetail } from '@/components/admin/CommunityProposalDetail';
import {
  getProposalById,
  listVotesForProposal,
  listEligibleVoters,
  getProjectByProposal,
  getContributionPlanByProposal,
  listProjectExpenses,
  listProjectUpdates,
} from '@/lib/queries/community';
import { getOrCreateReserveFund } from '@/lib/community/reserve-fund';

export default async function AdminCommunityProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdminRole();
  const proposal = await getProposalById(id);
  if (!proposal) notFound();
  assertOrganizationAccess(ctx, proposal.organization_id);

  const [votes, eligible, reserveFund, project, contributionPlan] = await Promise.all([
    listVotesForProposal(id),
    listEligibleVoters(id),
    getOrCreateReserveFund(proposal.organization_id),
    getProjectByProposal(id),
    getContributionPlanByProposal(id),
  ]);

  const [expenses, updates] = project
    ? await Promise.all([listProjectExpenses(project.id), listProjectUpdates(project.id)])
    : [[], []];

  return (
      <AdminShell
        ctx={ctx}
        activeSegment="community"
        pageTitle="Саналын дэлгэрэнгүй"
        pageSubtitle={proposal.title}
      >
        <CommunityProposalDetail
          proposal={proposal}
          reserveFund={reserveFund}
          votes={votes}
          eligibleCount={eligible.length}
          project={project}
          contributionPlan={contributionPlan}
          expenses={expenses}
          updates={updates}
        />
      </AdminShell>
  );
}
