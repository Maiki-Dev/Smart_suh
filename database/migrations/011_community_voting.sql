-- =====================================================================
-- 011_community_voting.sql — Community Voting + Auto Budget
-- Reserve fund, proposals, votes, contributions, projects
-- =====================================================================

SET TIME ZONE 'Asia/Ulaanbaatar';

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE proposal_category AS ENUM (
        'MAINTENANCE', 'REPAIR', 'IMPROVEMENT', 'SECURITY',
        'COMMUNITY', 'EMERGENCY', 'SPECIAL_EXPENSE', 'OTHER'
    );
    CREATE TYPE proposal_status AS ENUM (
        'DRAFT', 'PUBLISHED', 'VOTING_OPEN', 'VOTING_CLOSED',
        'APPROVED', 'REJECTED', 'NO_QUORUM',
        'BUDGET_RESERVED', 'FUNDING_IN_PROGRESS', 'FUNDED',
        'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    );
    CREATE TYPE proposal_funding_source AS ENUM (
        'RESERVE_FUND', 'MONTHLY_BUDGET', 'SPECIAL_CONTRIBUTION', 'MIXED'
    );
    CREATE TYPE proposal_approval_rule AS ENUM (
        'SIMPLE_MAJORITY', 'QUALIFIED_MAJORITY', 'QUORUM_REQUIRED',
        'ADMIN_DECISION', 'CUSTOM'
    );
    CREATE TYPE proposal_vote_choice AS ENUM ('YES', 'NO', 'ABSTAIN');
    CREATE TYPE proposal_voting_mode AS ENUM (
        'ONE_RESIDENT_ONE_VOTE', 'ONE_APARTMENT_ONE_VOTE',
        'WEIGHTED_BY_SQUARE_METER', 'WEIGHTED_CUSTOM'
    );
    CREATE TYPE contribution_allocation_method AS ENUM (
        'EQUAL_PER_APARTMENT', 'BY_SQUARE_METER', 'BY_RESIDENT_COUNT', 'CUSTOM'
    );
    CREATE TYPE contribution_plan_status AS ENUM (
        'PENDING', 'PARTIALLY_FUNDED', 'FULLY_FUNDED', 'OVERDUE', 'CANCELLED'
    );
    CREATE TYPE contribution_allocation_status AS ENUM (
        'PENDING', 'INVOICED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'
    );
    CREATE TYPE budget_allocation_status AS ENUM (
        'AVAILABLE', 'RESERVED', 'SPENT', 'RELEASED'
    );
    CREATE TYPE community_project_status AS ENUM (
        'READY_TO_START', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    );
    CREATE TYPE proposal_comment_status AS ENUM (
        'VISIBLE', 'HIDDEN', 'DELETED'
    );
    CREATE TYPE reserve_fund_tx_type AS ENUM (
        'DEPOSIT', 'RESERVE', 'RELEASE', 'SPEND', 'ADJUSTMENT'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend invoice fee type for community contributions
ALTER TYPE invoice_fee_type ADD VALUE IF NOT EXISTS 'COMMUNITY';

-- Extend notification type
ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'COMMUNITY';

-- ---------------------------------------------------------------------
-- ORGANIZATION RESERVE FUND
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organization_reserve_funds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL DEFAULT 'Нөөц сан',
    available_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    reserved_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    spent_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name),
    CHECK (available_amount >= 0),
    CHECK (reserved_amount >= 0),
    CHECK (spent_amount >= 0)
);

CREATE TABLE IF NOT EXISTS reserve_fund_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reserve_fund_id UUID NOT NULL REFERENCES organization_reserve_funds(id) ON DELETE CASCADE,
    proposal_id     UUID,
    project_id      UUID,
    tx_type         reserve_fund_tx_type NOT NULL,
    amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    balance_after_available NUMERIC(14,2) NOT NULL,
    balance_after_reserved  NUMERIC(14,2) NOT NULL,
    balance_after_spent     NUMERIC(14,2) NOT NULL,
    description     TEXT,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- COMMUNITY PROPOSALS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_proposals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    building_id         UUID REFERENCES buildings(id) ON DELETE SET NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    category            proposal_category NOT NULL DEFAULT 'OTHER',
    status              proposal_status NOT NULL DEFAULT 'DRAFT',
    estimated_budget    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (estimated_budget >= 0),
    actual_budget       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (actual_budget >= 0),
    funding_source      proposal_funding_source NOT NULL DEFAULT 'RESERVE_FUND',
    reserve_fund_id     UUID REFERENCES organization_reserve_funds(id) ON DELETE SET NULL,
    voting_start_at     TIMESTAMPTZ,
    voting_end_at       TIMESTAMPTZ,
    approval_rule       proposal_approval_rule NOT NULL DEFAULT 'SIMPLE_MAJORITY',
    quorum_percentage   NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (quorum_percentage BETWEEN 0 AND 100),
    approval_percentage NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (approval_percentage BETWEEN 0 AND 100),
    voting_mode         proposal_voting_mode NOT NULL DEFAULT 'ONE_APARTMENT_ONE_VOTE',
    vote_visibility     VARCHAR(20) NOT NULL DEFAULT 'PUBLIC' CHECK (vote_visibility IN ('PUBLIC', 'SECRET')),
    allow_vote_change   BOOLEAN NOT NULL DEFAULT TRUE,
    eligibility_rules   JSONB NOT NULL DEFAULT '{"scope":"ENTIRE_BUILDING"}'::jsonb,
    attachment_urls     JSONB NOT NULL DEFAULT '[]'::jsonb,
    result_yes_weight   NUMERIC(14,4) NOT NULL DEFAULT 0,
    result_no_weight    NUMERIC(14,4) NOT NULL DEFAULT 0,
    result_abstain_weight NUMERIC(14,4) NOT NULL DEFAULT 0,
    result_participation_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    result_decided_at   TIMESTAMPTZ,
    emergency_approved  BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    emergency_approved_at TIMESTAMPTZ,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reserve_fund_transactions
    ADD CONSTRAINT fk_rft_proposal FOREIGN KEY (proposal_id)
    REFERENCES community_proposals(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- ELIGIBLE VOTERS (materialized at publish)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS proposal_eligible_voters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id     UUID NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
    resident_id     UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    voting_weight   NUMERIC(10,4) NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (proposal_id, resident_id)
);

-- ---------------------------------------------------------------------
-- VOTES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS proposal_votes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id     UUID NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
    resident_id     UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    vote            proposal_vote_choice NOT NULL,
    weight          NUMERIC(10,4) NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (proposal_id, resident_id)
);

-- Apartment-mode uniqueness enforced in application layer (voting_mode dependent)

-- ---------------------------------------------------------------------
-- BUDGET ALLOCATIONS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS proposal_budget_allocations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id     UUID NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
    reserve_fund_id UUID REFERENCES organization_reserve_funds(id) ON DELETE SET NULL,
    allocated_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    reserved_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    spent_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
    status          budget_allocation_status NOT NULL DEFAULT 'AVAILABLE',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- CONTRIBUTION PLANS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contribution_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id         UUID NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    total_required      NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_collected     NUMERIC(14,2) NOT NULL DEFAULT 0,
    allocation_method   contribution_allocation_method NOT NULL DEFAULT 'EQUAL_PER_APARTMENT',
    due_date            DATE,
    status              contribution_plan_status NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contribution_allocations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_plan_id UUID NOT NULL REFERENCES contribution_plans(id) ON DELETE CASCADE,
    apartment_id        UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    resident_id         UUID REFERENCES residents(id) ON DELETE SET NULL,
    amount              NUMERIC(14,2) NOT NULL DEFAULT 0,
    paid_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
    invoice_id          UUID REFERENCES invoices(id) ON DELETE SET NULL,
    status              contribution_allocation_status NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (contribution_plan_id, apartment_id)
);

-- ---------------------------------------------------------------------
-- COMMUNITY PROJECTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id         UUID NOT NULL UNIQUE REFERENCES community_proposals(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status              community_project_status NOT NULL DEFAULT 'READY_TO_START',
    approved_budget     NUMERIC(14,2) NOT NULL DEFAULT 0,
    actual_spent        NUMERIC(14,2) NOT NULL DEFAULT 0,
    progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reserve_fund_transactions
    ADD CONSTRAINT fk_rft_project FOREIGN KEY (project_id)
    REFERENCES community_projects(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS project_expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES community_projects(id) ON DELETE CASCADE,
    amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    description     TEXT NOT NULL,
    supplier        VARCHAR(255),
    receipt_url     TEXT,
    expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_updates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES community_projects(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    content         TEXT,
    attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- PROPOSAL COMMENTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS proposal_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id     UUID NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
    resident_id     UUID REFERENCES residents(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    content         TEXT NOT NULL,
    status          proposal_comment_status NOT NULL DEFAULT 'VISIBLE',
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- INVOICES — link to community proposals
-- ---------------------------------------------------------------------

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS community_proposal_id UUID REFERENCES community_proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_community_proposal
    ON invoices (community_proposal_id) WHERE community_proposal_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_community_proposals_org_status
    ON community_proposals (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_community_proposals_voting_end
    ON community_proposals (voting_end_at) WHERE status = 'VOTING_OPEN';

CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal
    ON proposal_votes (proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_eligible_voters_proposal
    ON proposal_eligible_voters (proposal_id);

ALTER TABLE contribution_plans
    ADD CONSTRAINT uq_contribution_plans_proposal UNIQUE (proposal_id);

CREATE INDEX IF NOT EXISTS idx_community_projects_org
    ON community_projects (organization_id, status);

-- ---------------------------------------------------------------------
-- UPDATED_AT TRIGGERS
-- ---------------------------------------------------------------------

DO $$ BEGIN
    CREATE TRIGGER trg_community_proposals_updated
        BEFORE UPDATE ON community_proposals
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE TRIGGER trg_organization_reserve_funds_updated
        BEFORE UPDATE ON organization_reserve_funds
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE TRIGGER trg_proposal_budget_allocations_updated
        BEFORE UPDATE ON proposal_budget_allocations
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE TRIGGER trg_contribution_plans_updated
        BEFORE UPDATE ON contribution_plans
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE TRIGGER trg_contribution_allocations_updated
        BEFORE UPDATE ON contribution_allocations
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE TRIGGER trg_community_projects_updated
        BEFORE UPDATE ON community_projects
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE TRIGGER trg_proposal_comments_updated
        BEFORE UPDATE ON proposal_comments
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE TRIGGER trg_proposal_votes_updated
        BEFORE UPDATE ON proposal_votes
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
