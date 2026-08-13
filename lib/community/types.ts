import type { CommunityProposal } from '@/types';

export interface ProposalAdminRow extends CommunityProposal {
  building_name: string | null;
  vote_count: number;
  eligible_count: number;
}

export interface CommunityDashboardStats {
  active_votes: number;
  participation_pct: number;
  approved_projects: number;
  projects_in_progress: number;
  reserve_fund_total: number;
  pending_contributions: number;
}
