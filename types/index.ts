export type UUID = string;
export type Timestamp = string;

export type UserRole = 'SUPER_ADMIN' | 'HOA_ADMIN' | 'OPERATOR' | 'RESIDENT';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type ApartmentStatus = 'OCCUPIED' | 'VACANT' | 'MAINTENANCE';
export type ResidentStatus = 'ACTIVE' | 'INACTIVE' | 'MOVED_OUT';

export type InvoiceStatus =
  | 'PENDING'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type InvoiceFeeType =
  | 'APARTMENT'
  | 'PARKING'
  | 'WATER'
  | 'ELECTRICITY'
  | 'COMMUNITY';

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'QPAY'
  | 'SOCIALPAY'
  | 'CARD'
  | 'OTHER';

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';

export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'VAN' | 'TRUCK' | 'OTHER';
export type GateAction = 'ENTER' | 'EXIT' | 'DENIED';
export type BarrierStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type PassStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'USED';

export type MaintenanceCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'STRUCTURAL'
  | 'HVAC'
  | 'CLEANING'
  | 'OTHER';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MaintenanceStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD';

export type NotificationType =
  | 'INVOICE'
  | 'PAYMENT'
  | 'MAINTENANCE'
  | 'ANNOUNCEMENT'
  | 'GATE'
  | 'SYSTEM'
  | 'COMMUNITY';

export type ProposalCategory =
  | 'MAINTENANCE'
  | 'REPAIR'
  | 'IMPROVEMENT'
  | 'SECURITY'
  | 'COMMUNITY'
  | 'EMERGENCY'
  | 'SPECIAL_EXPENSE'
  | 'OTHER';

export type ProposalStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'VOTING_OPEN'
  | 'VOTING_CLOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'NO_QUORUM'
  | 'BUDGET_RESERVED'
  | 'FUNDING_IN_PROGRESS'
  | 'FUNDED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProposalFundingSource =
  | 'RESERVE_FUND'
  | 'MONTHLY_BUDGET'
  | 'SPECIAL_CONTRIBUTION'
  | 'MIXED';

export type ProposalApprovalRule =
  | 'SIMPLE_MAJORITY'
  | 'QUALIFIED_MAJORITY'
  | 'QUORUM_REQUIRED'
  | 'ADMIN_DECISION'
  | 'CUSTOM';

export type ProposalVoteChoice = 'YES' | 'NO' | 'ABSTAIN';

export type ProposalVotingMode =
  | 'ONE_RESIDENT_ONE_VOTE'
  | 'ONE_APARTMENT_ONE_VOTE'
  | 'WEIGHTED_BY_SQUARE_METER'
  | 'WEIGHTED_CUSTOM';

export type ContributionAllocationMethod =
  | 'EQUAL_PER_APARTMENT'
  | 'BY_SQUARE_METER'
  | 'BY_RESIDENT_COUNT'
  | 'CUSTOM';

export type ContributionPlanStatus =
  | 'PENDING'
  | 'PARTIALLY_FUNDED'
  | 'FULLY_FUNDED'
  | 'OVERDUE'
  | 'CANCELLED';

export type ContributionAllocationStatus =
  | 'PENDING'
  | 'INVOICED'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type BudgetAllocationStatus = 'AVAILABLE' | 'RESERVED' | 'SPENT' | 'RELEASED';

export type CommunityProjectStatus =
  | 'READY_TO_START'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProposalCommentStatus = 'VISIBLE' | 'HIDDEN' | 'DELETED';

export type ReserveFundTxType = 'DEPOSIT' | 'RESERVE' | 'RELEASE' | 'SPEND' | 'ADJUSTMENT';

export type VoteVisibility = 'PUBLIC' | 'SECRET';

export interface EligibilityRules {
  scope:
    | 'ENTIRE_BUILDING'
    | 'ENTRANCE'
    | 'FLOOR'
    | 'APARTMENTS'
    | 'PARKING_OWNERS'
    | 'ELIGIBLE_RESIDENTS';
  building_id?: string | null;
  entrances?: string[];
  floors?: number[];
  apartment_ids?: string[];
  parking_only?: boolean;
  contribution_method?: ContributionAllocationMethod;
  contribution_due_date?: string | null;
}

export interface Organization {
  id: UUID;
  name: string;
  registration_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface User {
  id: UUID;
  organization_id: UUID;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  must_change_password: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Building {
  id: UUID;
  organization_id: UUID;
  name: string;
  address: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Apartment {
  id: UUID;
  organization_id: UUID;
  building_id: UUID;
  tower: string | null;
  entrance: string | null;
  floor: number | null;
  apartment_number: string;
  area_m2: number | null;
  monthly_fee: number;
  apartment_fee: number;
  parking_fee: number;
  water_fee: number;
  electricity_fee: number;
  status: ApartmentStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Resident {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  user_id: UUID | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  is_owner: boolean;
  status: ResidentStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Invoice {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  invoice_number: string;
  billing_year: number;
  billing_month: number;
  fee_type: InvoiceFeeType;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: InvoiceStatus;
  community_proposal_id: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Payment {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  invoice_id: UUID | null;
  amount: number;
  payment_method: PaymentMethod;
  transaction_id: string | null;
  status: PaymentStatus;
  paid_at: Timestamp;
  created_by: UUID | null;
  created_at: Timestamp;
}

export interface Vehicle {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  plate_number: string;
  vehicle_type: VehicleType;
  owner_name: string | null;
  rfid_number: string | null;
  active: boolean;
  gate_access: boolean;
  access_started_at: Timestamp | null;
  access_expires_at: Timestamp | null;
  disabled_at: Timestamp | null;
  disabled_reason: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface GateAccessLog {
  id: UUID;
  organization_id: UUID;
  vehicle_id: UUID | null;
  apartment_id: UUID | null;
  action: GateAction;
  reason: string | null;
  triggered_by: string | null;
  created_at: Timestamp;
}

export interface BarrierJob {
  id: UUID;
  organization_id: UUID;
  vehicle_id: UUID | null;
  action: string;
  status: BarrierStatus;
  attempts: number;
  payload: Record<string, unknown>;
  last_error: string | null;
  processed_at: Timestamp | null;
  created_at: Timestamp;
}

export interface VisitorPass {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  created_by: UUID | null;
  visitor_name: string;
  phone: string | null;
  plate_number: string | null;
  valid_from: Timestamp;
  valid_until: Timestamp;
  qr_code: string | null;
  status: PassStatus;
  created_at: Timestamp;
}

export interface MaintenanceRequest {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  created_by: UUID | null;
  assigned_to: UUID | null;
  title: string;
  description: string | null;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  incident_id: UUID | null;
  detected_issue_type: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MaintenanceComment {
  id: UUID;
  request_id: UUID;
  user_id: UUID | null;
  comment: string;
  created_at: Timestamp;
}

export interface Announcement {
  id: UUID;
  organization_id: UUID;
  title: string;
  content: string;
  image_url: string | null;
  attachment_url: string | null;
  published_at: Timestamp | null;
  expires_at: Timestamp | null;
  is_pinned: boolean;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Notification {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  type: NotificationType;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: Timestamp;
}

export interface AuditLog {
  id: UUID;
  organization_id: UUID;
  actor_id: UUID | null;
  action: string;
  entity_type: string;
  entity_id: UUID | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: Timestamp;
}

export interface Session {
  id: UUID;
  session_token: string;
  user_id: UUID;
  organization_id: UUID;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Timestamp;
  created_at: Timestamp;
  last_active_at: Timestamp;
}

export interface OrganizationReserveFund {
  id: UUID;
  organization_id: UUID;
  name: string;
  available_amount: number;
  reserved_amount: number;
  spent_amount: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CommunityProposal {
  id: UUID;
  organization_id: UUID;
  building_id: UUID | null;
  title: string;
  description: string | null;
  category: ProposalCategory;
  status: ProposalStatus;
  estimated_budget: number;
  actual_budget: number;
  funding_source: ProposalFundingSource;
  reserve_fund_id: UUID | null;
  voting_start_at: Timestamp | null;
  voting_end_at: Timestamp | null;
  approval_rule: ProposalApprovalRule;
  quorum_percentage: number;
  approval_percentage: number;
  voting_mode: ProposalVotingMode;
  vote_visibility: VoteVisibility;
  allow_vote_change: boolean;
  eligibility_rules: EligibilityRules;
  attachment_urls: string[];
  result_yes_weight: number;
  result_no_weight: number;
  result_abstain_weight: number;
  result_participation_pct: number;
  result_decided_at: Timestamp | null;
  emergency_approved: boolean;
  emergency_approved_by: UUID | null;
  emergency_approved_at: Timestamp | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ProposalVote {
  id: UUID;
  proposal_id: UUID;
  resident_id: UUID;
  apartment_id: UUID;
  vote: ProposalVoteChoice;
  weight: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ProposalEligibleVoter {
  id: UUID;
  proposal_id: UUID;
  resident_id: UUID;
  apartment_id: UUID;
  voting_weight: number;
  created_at: Timestamp;
}

export interface ContributionPlan {
  id: UUID;
  proposal_id: UUID;
  organization_id: UUID;
  total_required: number;
  total_collected: number;
  allocation_method: ContributionAllocationMethod;
  due_date: string | null;
  status: ContributionPlanStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ContributionAllocation {
  id: UUID;
  contribution_plan_id: UUID;
  apartment_id: UUID;
  resident_id: UUID | null;
  amount: number;
  paid_amount: number;
  invoice_id: UUID | null;
  status: ContributionAllocationStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CommunityProject {
  id: UUID;
  proposal_id: UUID;
  organization_id: UUID;
  status: CommunityProjectStatus;
  approved_budget: number;
  actual_spent: number;
  progress_percentage: number;
  started_at: Timestamp | null;
  completed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ProjectExpense {
  id: UUID;
  project_id: UUID;
  amount: number;
  description: string;
  supplier: string | null;
  receipt_url: string | null;
  expense_date: string;
  created_by: UUID | null;
  created_at: Timestamp;
}

export interface ProjectUpdate {
  id: UUID;
  project_id: UUID;
  title: string;
  content: string | null;
  attachment_urls: string[];
  created_by: UUID | null;
  created_at: Timestamp;
}

export interface ProposalComment {
  id: UUID;
  proposal_id: UUID;
  resident_id: UUID | null;
  user_id: UUID | null;
  content: string;
  status: ProposalCommentStatus;
  is_pinned: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface ListResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
