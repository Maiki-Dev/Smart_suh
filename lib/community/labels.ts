import type {
  ProposalApprovalRule,
  ProposalCategory,
  ProposalFundingSource,
  ProposalStatus,
  ProposalVoteChoice,
  ProposalVotingMode,
  ContributionAllocationMethod,
  CommunityProjectStatus,
} from '@/types';

export function proposalCategoryLabel(c: ProposalCategory): string {
  const map: Record<ProposalCategory, string> = {
    MAINTENANCE: 'Төлөвлөгөөт засвар',
    REPAIR: 'Засвар',
    IMPROVEMENT: 'Сайжруулалт',
    SECURITY: 'Аюулгүй байдал',
    COMMUNITY: 'Нийгмийн',
    EMERGENCY: 'Яаралтай',
    SPECIAL_EXPENSE: 'Онцгой зардал',
    OTHER: 'Бусад',
  };
  return map[c] ?? c;
}

export function proposalStatusLabel(s: ProposalStatus): string {
  const map: Record<ProposalStatus, string> = {
    DRAFT: 'Ноорог',
    PUBLISHED: 'Нийтэлсэн',
    VOTING_OPEN: 'Санал хураалт',
    VOTING_CLOSED: 'Санал хаагдсан',
    APPROVED: 'Батлагдсан',
    REJECTED: 'Татгалзсан',
    NO_QUORUM: 'Quorum хүрээгүй',
    BUDGET_RESERVED: 'Төсөв нөөцлөгдсөн',
    FUNDING_IN_PROGRESS: 'Санхүүжилт явагдаж байна',
    FUNDED: 'Бүрэн санхүүжсэн',
    IN_PROGRESS: 'Хэрэгжиж байна',
    COMPLETED: 'Дууссан',
    CANCELLED: 'Цуцлагдсан',
  };
  return map[s] ?? s;
}

export function fundingSourceLabel(f: ProposalFundingSource): string {
  const map: Record<ProposalFundingSource, string> = {
    RESERVE_FUND: 'Нөөц сан',
    MONTHLY_BUDGET: 'Сарын төсөв',
    SPECIAL_CONTRIBUTION: 'Нэмэлт хувь нэмэр',
    MIXED: 'Холимog',
  };
  return map[f] ?? f;
}

export function approvalRuleLabel(r: ProposalApprovalRule): string {
  const map: Record<ProposalApprovalRule, string> = {
    SIMPLE_MAJORITY: 'Энгийн majority (YES > NO)',
    QUALIFIED_MAJORITY: 'Qualified majority',
    QUORUM_REQUIRED: 'Quorum шаардлагатай',
    ADMIN_DECISION: 'Админ шийдвэр',
    CUSTOM: 'Тусгай',
  };
  return map[r] ?? r;
}

export function votingModeLabel(m: ProposalVotingMode): string {
  const map: Record<ProposalVotingMode, string> = {
    ONE_RESIDENT_ONE_VOTE: '1 оршин суугч = 1 санал',
    ONE_APARTMENT_ONE_VOTE: '1 орон сууц = 1 санал',
    WEIGHTED_BY_SQUARE_METER: 'Талбайгаар жинлэсэн',
    WEIGHTED_CUSTOM: 'Тусгай жин',
  };
  return map[m] ?? m;
}

export function voteChoiceLabel(v: ProposalVoteChoice): string {
  const map: Record<ProposalVoteChoice, string> = {
    YES: 'Зөвшөөрөх',
    NO: 'Татгалзах',
    ABSTAIN: 'Түдгэлзэх',
  };
  return map[v] ?? v;
}

export function contributionMethodLabel(m: ContributionAllocationMethod): string {
  const map: Record<ContributionAllocationMethod, string> = {
    EQUAL_PER_APARTMENT: 'Орон сууц тус бүрт тэнцүү',
    BY_SQUARE_METER: 'Талбайгаар',
    BY_RESIDENT_COUNT: 'Оршин суугчийн тоогоор',
    CUSTOM: 'Гараар',
  };
  return map[m] ?? m;
}

export function projectStatusLabel(s: CommunityProjectStatus): string {
  const map: Record<CommunityProjectStatus, string> = {
    READY_TO_START: 'Эхлэхэд бэлэн',
    IN_PROGRESS: 'Хэрэгжиж байна',
    COMPLETED: 'Дууссан',
    CANCELLED: 'Цуцлагдсан',
  };
  return map[s] ?? s;
}

export function proposalStatusVariant(
  s: ProposalStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['APPROVED', 'FUNDED', 'COMPLETED'].includes(s)) return 'default';
  if (['REJECTED', 'CANCELLED', 'NO_QUORUM'].includes(s)) return 'destructive';
  if (['VOTING_OPEN', 'FUNDING_IN_PROGRESS', 'IN_PROGRESS'].includes(s)) return 'secondary';
  return 'outline';
}
