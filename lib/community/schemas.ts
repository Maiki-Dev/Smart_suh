import { z } from 'zod';
import type {
  ContributionAllocationMethod,
  EligibilityRules,
  ProposalApprovalRule,
  ProposalCategory,
  ProposalFundingSource,
  ProposalVoteChoice,
  ProposalVotingMode,
  VoteVisibility,
} from '@/types';

const emptyToNull = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

export const proposalCategories = [
  'MAINTENANCE',
  'REPAIR',
  'IMPROVEMENT',
  'SECURITY',
  'COMMUNITY',
  'EMERGENCY',
  'SPECIAL_EXPENSE',
  'OTHER',
] as const satisfies readonly ProposalCategory[];

export const proposalFundingSources = [
  'RESERVE_FUND',
  'MONTHLY_BUDGET',
  'SPECIAL_CONTRIBUTION',
  'MIXED',
] as const satisfies readonly ProposalFundingSource[];

export const proposalApprovalRules = [
  'SIMPLE_MAJORITY',
  'QUALIFIED_MAJORITY',
  'QUORUM_REQUIRED',
  'ADMIN_DECISION',
  'CUSTOM',
] as const satisfies readonly ProposalApprovalRule[];

export const proposalVotingModes = [
  'ONE_RESIDENT_ONE_VOTE',
  'ONE_APARTMENT_ONE_VOTE',
  'WEIGHTED_BY_SQUARE_METER',
  'WEIGHTED_CUSTOM',
] as const satisfies readonly ProposalVotingMode[];

export const contributionMethods = [
  'EQUAL_PER_APARTMENT',
  'BY_SQUARE_METER',
  'BY_RESIDENT_COUNT',
  'CUSTOM',
] as const satisfies readonly ContributionAllocationMethod[];

export const voteChoices = ['YES', 'NO', 'ABSTAIN'] as const satisfies readonly ProposalVoteChoice[];

export const eligibilityRulesSchema = z.object({
  scope: z.enum([
    'ENTIRE_BUILDING',
    'ENTRANCE',
    'FLOOR',
    'APARTMENTS',
    'PARKING_OWNERS',
    'ELIGIBLE_RESIDENTS',
  ]),
  building_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  entrances: z.array(z.string()).optional(),
  floors: z.array(z.coerce.number().int()).optional(),
  apartment_ids: z.array(z.string().uuid()).optional(),
  parking_only: z.coerce.boolean().optional(),
});

export const createProposalSchema = z.object({
  title: z.string().trim().min(3, 'Гарчиг оруулна уу').max(500),
  description: z.preprocess(emptyToNull, z.string().max(10000).nullable().optional()),
  category: z.enum(proposalCategories),
  building_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  estimated_budget: z.coerce.number().min(0, 'Төсөв 0-ээс их байх ёстой'),
  funding_source: z.enum(proposalFundingSources),
  reserve_fund_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  voting_start_at: z.string().min(1, 'Эхлэх огноо оруулна уу'),
  voting_end_at: z.string().min(1, 'Дуусах огноо оруулна уу'),
  approval_rule: z.enum(proposalApprovalRules),
  quorum_percentage: z.coerce.number().min(0).max(100).default(50),
  approval_percentage: z.coerce.number().min(0).max(100).default(50),
  voting_mode: z.enum(proposalVotingModes).default('ONE_APARTMENT_ONE_VOTE'),
  vote_visibility: z.enum(['PUBLIC', 'SECRET'] as const satisfies readonly VoteVisibility[]).default('PUBLIC'),
  allow_vote_change: z.coerce.boolean().default(true),
  eligibility_scope: z.enum([
    'ENTIRE_BUILDING',
    'ENTRANCE',
    'FLOOR',
    'APARTMENTS',
    'PARKING_OWNERS',
    'ELIGIBLE_RESIDENTS',
  ]),
  eligibility_entrances: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : []),
    z.array(z.string()).optional(),
  ),
  eligibility_floors: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n)) : []),
    z.array(z.number().int()).optional(),
  ),
  eligibility_apartment_ids: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : []),
    z.array(z.string().uuid()).optional(),
  ),
  contribution_method: z.enum(contributionMethods).optional(),
  contribution_due_date: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export const castVoteSchema = z.object({
  proposal_id: z.string().uuid(),
  vote: z.enum(voteChoices),
});

export const proposalCommentSchema = z.object({
  proposal_id: z.string().uuid(),
  content: z.string().trim().min(1, 'Сэтгэгдэл оруулна уу').max(2000),
});

export const projectExpenseSchema = z.object({
  project_id: z.string().uuid(),
  amount: z.coerce.number().positive('Дүн 0-ээс их байх ёстой'),
  description: z.string().trim().min(1).max(2000),
  supplier: z.preprocess(emptyToNull, z.string().max(255).nullable().optional()),
  receipt_url: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  expense_date: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export const projectUpdateSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().trim().min(1).max(500),
  content: z.preprocess(emptyToNull, z.string().max(5000).nullable().optional()),
});

export const reserveFundDepositSchema = z.object({
  amount: z.coerce.number().positive('Дүн 0-ээс их байх ёстой'),
  description: z.preprocess(emptyToNull, z.string().max(500).nullable().optional()),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;

export function buildEligibilityRules(input: CreateProposalInput): EligibilityRules {
  return {
    scope: input.eligibility_scope,
    building_id: input.building_id ?? null,
    entrances: input.eligibility_entrances,
    floors: input.eligibility_floors,
    apartment_ids: input.eligibility_apartment_ids,
    parking_only: input.eligibility_scope === 'PARKING_OWNERS',
  };
}
