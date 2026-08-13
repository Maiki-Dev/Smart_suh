import 'server-only';

import { query, type DbClient } from '@/lib/db';
import type {
  CommunityDashboardStats,
  ProposalAdminRow,
} from '@/lib/community/types';
import type {
  CommunityProposal,
  CommunityProject,
  ContributionAllocation,
  ContributionPlan,
  ProjectExpense,
  ProjectUpdate,
  EligibilityRules,
  ProposalComment,
  ProposalEligibleVoter,
  ProposalVote,
  ProposalStatus,
} from '@/types';

export type { CommunityDashboardStats, ProposalAdminRow } from '@/lib/community/types';

function parseProposal(row: Record<string, unknown>): CommunityProposal {
  return {
    ...row,
    estimated_budget: parseFloat(String(row.estimated_budget)),
    actual_budget: parseFloat(String(row.actual_budget)),
    quorum_percentage: parseFloat(String(row.quorum_percentage)),
    approval_percentage: parseFloat(String(row.approval_percentage)),
    result_yes_weight: parseFloat(String(row.result_yes_weight)),
    result_no_weight: parseFloat(String(row.result_no_weight)),
    result_abstain_weight: parseFloat(String(row.result_abstain_weight)),
    result_participation_pct: parseFloat(String(row.result_participation_pct)),
    eligibility_rules: (row.eligibility_rules ?? {}) as EligibilityRules,
    attachment_urls: Array.isArray(row.attachment_urls) ? row.attachment_urls as string[] : [],
  } as CommunityProposal;
}

const PROPOSAL_SELECT = `
  SELECT id, organization_id, building_id, title, description, category, status,
         estimated_budget, actual_budget, funding_source, reserve_fund_id,
         voting_start_at, voting_end_at, approval_rule, quorum_percentage,
         approval_percentage, voting_mode, vote_visibility, allow_vote_change,
         eligibility_rules, attachment_urls,
         result_yes_weight, result_no_weight, result_abstain_weight,
         result_participation_pct, result_decided_at,
         emergency_approved, emergency_approved_by, emergency_approved_at,
         created_by, created_at, updated_at
    FROM community_proposals
`;

export async function getProposalById(
  id: string,
  client?: DbClient,
): Promise<CommunityProposal | null> {
  const { rows } = await query(`${PROPOSAL_SELECT} WHERE id = $1`, [id], client);
  return rows[0] ? parseProposal(rows[0]) : null;
}

export async function updateProposalStatus(
  id: string,
  status: ProposalStatus,
  client?: DbClient,
): Promise<void> {
  await query(
    `UPDATE community_proposals SET status = $1::proposal_status WHERE id = $2`,
    [status, id],
    client,
  );
}

export async function listProposalsAdmin(
  organizationId: string | null,
  opts: {
    status?: ProposalStatus;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ data: ProposalAdminRow[]; total: number }> {
  const { status, limit = 50, offset = 0 } = opts;
  const clauses = organizationId ? ['p.organization_id = $1'] : ['TRUE'];
  const params: unknown[] = organizationId ? [organizationId] : [];
  let idx = params.length + 1;

  if (status) {
    clauses.push(`p.status = $${idx++}::proposal_status`);
    params.push(status);
  }

  const where = clauses.join(' AND ');
  const [dataRes, countRes] = await Promise.all([
    query(
      `
        SELECT p.*, b.name AS building_name,
               (SELECT COUNT(*)::int FROM proposal_votes v WHERE v.proposal_id = p.id) AS vote_count,
               (SELECT COUNT(*)::int FROM proposal_eligible_voters e WHERE e.proposal_id = p.id) AS eligible_count
          FROM community_proposals p
          LEFT JOIN buildings b ON p.building_id = b.id
         WHERE ${where}
         ORDER BY p.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}
      `,
      [...params, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM community_proposals p WHERE ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows.map((r) => ({
      ...parseProposal(r),
      building_name: r.building_name as string | null,
      vote_count: r.vote_count as number,
      eligible_count: r.eligible_count as number,
    })),
    total: parseInt(countRes.rows[0]?.count ?? '0', 10),
  };
}

export async function listProposalsForResident(
  organizationId: string,
  residentId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<Array<CommunityProposal & { has_voted: boolean; is_eligible: boolean }>> {
  const statusClause = opts.activeOnly
    ? `AND p.status IN ('VOTING_OPEN', 'PUBLISHED')`
    : '';

  const { rows } = await query(
    `
      SELECT p.*,
             EXISTS (
               SELECT 1 FROM proposal_eligible_voters e
                WHERE e.proposal_id = p.id AND e.resident_id = $2
             ) AS is_eligible,
             EXISTS (
               SELECT 1 FROM proposal_votes v
                WHERE v.proposal_id = p.id AND v.resident_id = $2
             ) AS has_voted
        FROM community_proposals p
       WHERE p.organization_id = $1
         AND p.status NOT IN ('DRAFT', 'CANCELLED')
         ${statusClause}
       ORDER BY
         CASE WHEN p.status = 'VOTING_OPEN' THEN 0 ELSE 1 END,
         p.voting_end_at NULLS LAST,
         p.created_at DESC
    `,
    [organizationId, residentId],
  );

  return rows.map((r) => ({
    ...parseProposal(r),
    has_voted: Boolean(r.has_voted),
    is_eligible: Boolean(r.is_eligible),
  }));
}

export async function insertEligibleVoters(
  proposalId: string,
  voters: Array<{ resident_id: string; apartment_id: string; voting_weight: number }>,
  client?: DbClient,
): Promise<void> {
  for (const v of voters) {
    await query(
      `
        INSERT INTO proposal_eligible_voters (proposal_id, resident_id, apartment_id, voting_weight)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (proposal_id, resident_id) DO NOTHING
      `,
      [proposalId, v.resident_id, v.apartment_id, v.voting_weight],
      client,
    );
  }
}

export async function listEligibleVoters(
  proposalId: string,
  client?: DbClient,
): Promise<Array<ProposalEligibleVoter & { user_id: string | null; first_name: string; last_name: string }>> {
  const { rows } = await query(
    `
      SELECT e.*, r.user_id, r.first_name, r.last_name
        FROM proposal_eligible_voters e
        JOIN residents r ON e.resident_id = r.id
       WHERE e.proposal_id = $1
    `,
    [proposalId],
    client,
  );
  return rows.map((r) => ({
    ...r,
    voting_weight: parseFloat(String(r.voting_weight)),
  })) as Array<ProposalEligibleVoter & { user_id: string | null; first_name: string; last_name: string }>;
}

export async function getEligibleVoter(
  proposalId: string,
  residentId: string,
  client?: DbClient,
): Promise<ProposalEligibleVoter | null> {
  const { rows } = await query<ProposalEligibleVoter>(
    `SELECT * FROM proposal_eligible_voters WHERE proposal_id = $1 AND resident_id = $2`,
    [proposalId, residentId],
    client,
  );
  const row = rows[0];
  if (!row) return null;
  return { ...row, voting_weight: parseFloat(String(row.voting_weight)) };
}

export async function listVotesForProposal(
  proposalId: string,
  client?: DbClient,
): Promise<Array<ProposalVote & { first_name?: string; last_name?: string; apartment_number?: string }>> {
  const { rows } = await query(
    `
      SELECT v.*, r.first_name, r.last_name, a.apartment_number
        FROM proposal_votes v
        JOIN residents r ON v.resident_id = r.id
        JOIN apartments a ON v.apartment_id = a.id
       WHERE v.proposal_id = $1
       ORDER BY v.created_at
    `,
    [proposalId],
    client,
  );
  return rows.map((r) => ({ ...r, weight: parseFloat(String(r.weight)) })) as ProposalVote[];
}

export async function upsertVote(
  input: {
    proposal_id: string;
    resident_id: string;
    apartment_id: string;
    vote: string;
    weight: number;
  },
  client?: DbClient,
): Promise<void> {
  await query(
    `
      INSERT INTO proposal_votes (proposal_id, resident_id, apartment_id, vote, weight)
      VALUES ($1, $2, $3, $4::proposal_vote_choice, $5)
      ON CONFLICT (proposal_id, resident_id)
      DO UPDATE SET vote = EXCLUDED.vote, weight = EXCLUDED.weight, updated_at = NOW()
    `,
    [input.proposal_id, input.resident_id, input.apartment_id, input.vote, input.weight],
    client,
  );
}

export async function getVoteByResident(
  proposalId: string,
  residentId: string,
): Promise<ProposalVote | null> {
  const { rows } = await query<ProposalVote>(
    `SELECT * FROM proposal_votes WHERE proposal_id = $1 AND resident_id = $2`,
    [proposalId, residentId],
  );
  const row = rows[0];
  if (!row) return null;
  return { ...row, weight: parseFloat(String(row.weight)) };
}

export async function createProposal(
  input: Omit<CommunityProposal, 'id' | 'created_at' | 'updated_at' | 'result_yes_weight' | 'result_no_weight' | 'result_abstain_weight' | 'result_participation_pct' | 'result_decided_at' | 'emergency_approved' | 'emergency_approved_by' | 'emergency_approved_at' | 'actual_budget' | 'attachment_urls'> & {
    attachment_urls?: string[];
    created_by: string;
  },
  client?: DbClient,
): Promise<CommunityProposal> {
  const { rows } = await query(
    `
      INSERT INTO community_proposals (
        organization_id, building_id, title, description, category, status,
        estimated_budget, funding_source, reserve_fund_id,
        voting_start_at, voting_end_at, approval_rule, quorum_percentage,
        approval_percentage, voting_mode, vote_visibility, allow_vote_change,
        eligibility_rules, attachment_urls, created_by
      ) VALUES (
        $1, $2, $3, $4, $5::proposal_category, $6::proposal_status,
        $7, $8::proposal_funding_source, $9,
        $10::timestamptz, $11::timestamptz, $12::proposal_approval_rule, $13, $14,
        $15::proposal_voting_mode, $16, $17,
        $18::jsonb, $19::jsonb, $20
      )
      RETURNING *
    `,
    [
      input.organization_id,
      input.building_id,
      input.title,
      input.description,
      input.category,
      input.status,
      input.estimated_budget,
      input.funding_source,
      input.reserve_fund_id,
      input.voting_start_at,
      input.voting_end_at,
      input.approval_rule,
      input.quorum_percentage,
      input.approval_percentage,
      input.voting_mode,
      input.vote_visibility,
      input.allow_vote_change,
      JSON.stringify(input.eligibility_rules),
      JSON.stringify(input.attachment_urls ?? []),
      input.created_by,
    ],
    client,
  );
  return parseProposal(rows[0]);
}

export async function getContributionPlanByProposal(
  proposalId: string,
  client?: DbClient,
): Promise<ContributionPlan | null> {
  const { rows } = await query<ContributionPlan>(
    `SELECT * FROM contribution_plans WHERE proposal_id = $1 LIMIT 1`,
    [proposalId],
    client,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    total_required: parseFloat(String(row.total_required)),
    total_collected: parseFloat(String(row.total_collected)),
  };
}

export async function listContributionAllocations(
  planId: string,
  client?: DbClient,
): Promise<ContributionAllocation[]> {
  const { rows } = await query<ContributionAllocation>(
    `SELECT * FROM contribution_allocations WHERE contribution_plan_id = $1 ORDER BY amount DESC`,
    [planId],
    client,
  );
  return rows.map((r) => ({
    ...r,
    amount: parseFloat(String(r.amount)),
    paid_amount: parseFloat(String(r.paid_amount)),
  }));
}

export async function getProjectByProposal(
  proposalId: string,
  client?: DbClient,
): Promise<CommunityProject | null> {
  const { rows } = await query<CommunityProject>(
    `SELECT * FROM community_projects WHERE proposal_id = $1`,
    [proposalId],
    client,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    approved_budget: parseFloat(String(row.approved_budget)),
    actual_spent: parseFloat(String(row.actual_spent)),
    progress_percentage: parseFloat(String(row.progress_percentage)),
  };
}

export async function listProjectExpenses(projectId: string): Promise<ProjectExpense[]> {
  const { rows } = await query<ProjectExpense>(
    `SELECT * FROM project_expenses WHERE project_id = $1 ORDER BY expense_date DESC`,
    [projectId],
  );
  return rows.map((r) => ({ ...r, amount: parseFloat(String(r.amount)) }));
}

export async function listProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
  const { rows } = await query<ProjectUpdate>(
    `SELECT * FROM project_updates WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId],
  );
  return rows.map((r) => ({
    ...r,
    attachment_urls: Array.isArray(r.attachment_urls) ? (r.attachment_urls as string[]) : [],
  }));
}

export async function listProposalComments(proposalId: string): Promise<ProposalComment[]> {
  const { rows } = await query(
    `
      SELECT c.*, r.first_name, r.last_name, a.apartment_number
        FROM proposal_comments c
        LEFT JOIN residents r ON c.resident_id = r.id
        LEFT JOIN apartments a ON r.apartment_id = a.id
       WHERE c.proposal_id = $1 AND c.status = 'VISIBLE'
       ORDER BY c.is_pinned DESC, c.created_at ASC
    `,
    [proposalId],
  );
  return rows as ProposalComment[];
}

export async function insertProposalComment(input: {
  proposal_id: string;
  resident_id: string;
  user_id: string;
  content: string;
}): Promise<ProposalComment> {
  const { rows } = await query<ProposalComment>(
    `
      INSERT INTO proposal_comments (proposal_id, resident_id, user_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [input.proposal_id, input.resident_id, input.user_id, input.content],
  );
  return rows[0];
}

export async function getCommunityDashboardStats(
  organizationId: string,
): Promise<CommunityDashboardStats> {
  const { rows } = await query(
    `
      WITH active AS (
        SELECT COUNT(*)::int AS active_votes
          FROM community_proposals
         WHERE organization_id = $1 AND status = 'VOTING_OPEN'
      ),
      participation AS (
        SELECT COALESCE(AVG(result_participation_pct), 0)::numeric(5,2) AS participation_pct
          FROM community_proposals
         WHERE organization_id = $1 AND result_decided_at IS NOT NULL
           AND result_decided_at >= NOW() - INTERVAL '90 days'
      ),
      approved AS (
        SELECT COUNT(*)::int AS approved_projects
          FROM community_proposals
         WHERE organization_id = $1 AND status IN ('APPROVED', 'BUDGET_RESERVED', 'FUNDING_IN_PROGRESS', 'FUNDED', 'IN_PROGRESS', 'COMPLETED')
      ),
      in_progress AS (
        SELECT COUNT(*)::int AS projects_in_progress
          FROM community_projects
         WHERE organization_id = $1 AND status = 'IN_PROGRESS'
      ),
      reserve AS (
        SELECT COALESCE(SUM(available_amount + reserved_amount), 0)::numeric(14,2) AS reserve_fund_total
          FROM organization_reserve_funds
         WHERE organization_id = $1
      ),
      pending AS (
        SELECT COALESCE(SUM(total_required - total_collected), 0)::numeric(14,2) AS pending_contributions
          FROM contribution_plans
         WHERE organization_id = $1 AND status IN ('PENDING', 'PARTIALLY_FUNDED', 'OVERDUE')
      )
      SELECT a.active_votes, p.participation_pct, ap.approved_projects,
             ip.projects_in_progress, r.reserve_fund_total, pe.pending_contributions
        FROM active a, participation p, approved ap, in_progress ip, reserve r, pending pe
    `,
    [organizationId],
  );
  const row = rows[0] ?? {};
  return {
    active_votes: row.active_votes ?? 0,
    participation_pct: parseFloat(String(row.participation_pct ?? 0)),
    approved_projects: row.approved_projects ?? 0,
    projects_in_progress: row.projects_in_progress ?? 0,
    reserve_fund_total: parseFloat(String(row.reserve_fund_total ?? 0)),
    pending_contributions: parseFloat(String(row.pending_contributions ?? 0)),
  };
}

export async function getResidentCommunitySummary(
  organizationId: string,
  residentId: string,
  apartmentId: string,
): Promise<{
  active_votes: number;
  ending_soon: number;
  outstanding_contribution: number;
  projects_supported: number;
}> {
  const { rows } = await query(
    `
      WITH active AS (
        SELECT COUNT(*)::int AS active_votes
          FROM community_proposals p
          JOIN proposal_eligible_voters e ON e.proposal_id = p.id
         WHERE p.organization_id = $1 AND e.resident_id = $2
           AND p.status = 'VOTING_OPEN'
      ),
      ending AS (
        SELECT COUNT(*)::int AS ending_soon
          FROM community_proposals p
          JOIN proposal_eligible_voters e ON e.proposal_id = p.id
         WHERE p.organization_id = $1 AND e.resident_id = $2
           AND p.status = 'VOTING_OPEN'
           AND p.voting_end_at <= NOW() + INTERVAL '24 hours'
      ),
      outstanding AS (
        SELECT COALESCE(SUM(ca.amount - ca.paid_amount), 0)::numeric(14,2) AS outstanding_contribution
          FROM contribution_allocations ca
          JOIN contribution_plans cp ON ca.contribution_plan_id = cp.id
         WHERE cp.organization_id = $1 AND ca.apartment_id = $3
           AND ca.status NOT IN ('PAID', 'CANCELLED')
      ),
      supported AS (
        SELECT COUNT(DISTINCT cp.proposal_id)::int AS projects_supported
          FROM contribution_allocations ca
          JOIN contribution_plans cp ON ca.contribution_plan_id = cp.id
         WHERE cp.organization_id = $1 AND ca.apartment_id = $3
           AND ca.paid_amount > 0
      )
      SELECT a.active_votes, e.ending_soon, o.outstanding_contribution, s.projects_supported
        FROM active a, ending e, outstanding o, supported s
    `,
    [organizationId, residentId, apartmentId],
  );
  const row = rows[0] ?? {};
  return {
    active_votes: row.active_votes ?? 0,
    ending_soon: row.ending_soon ?? 0,
    outstanding_contribution: parseFloat(String(row.outstanding_contribution ?? 0)),
    projects_supported: row.projects_supported ?? 0,
  };
}
