-- =====================================================================
-- 001_initial.sql — Smart СӨХ Management System
-- Tables: organizations, users, buildings, apartments, residents,
--         invoices, payments, vehicles, gate_access_logs, barrier_jobs,
--         visitor_passes, maintenance_requests, maintenance_comments,
--         announcements, notifications, audit_logs
-- =====================================================================

SET TIME ZONE 'Asia/Ulaanbaatar';

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role      AS ENUM ('SUPER_ADMIN', 'HOA_ADMIN', 'OPERATOR', 'RESIDENT');
    CREATE TYPE user_status    AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
    CREATE TYPE apt_status     AS ENUM ('OCCUPIED', 'VACANT', 'MAINTENANCE');
    CREATE TYPE res_status     AS ENUM ('ACTIVE', 'INACTIVE', 'MOVED_OUT');
    CREATE TYPE inv_status     AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
    CREATE TYPE pay_method     AS ENUM ('CASH', 'BANK_TRANSFER', 'QPAY', 'SOCIALPAY', 'CARD', 'OTHER');
    CREATE TYPE pay_status     AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');
    CREATE TYPE vehicle_type   AS ENUM ('CAR', 'MOTORCYCLE', 'VAN', 'TRUCK', 'OTHER');
    CREATE TYPE gate_action    AS ENUM ('ENTER', 'EXIT', 'DENIED');
    CREATE TYPE barrier_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
    CREATE TYPE pass_status    AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'USED');
    CREATE TYPE maint_cat      AS ENUM ('PLUMBING', 'ELECTRICAL', 'STRUCTURAL', 'HVAC', 'CLEANING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE maint_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    CREATE TYPE maint_status   AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
    CREATE TYPE notif_type     AS ENUM ('INVOICE', 'PAYMENT', 'MAINTENANCE', 'ANNOUNCEMENT', 'GATE', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 1. ORGANIZATIONS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    address             TEXT,
    phone               VARCHAR(50),
    email               VARCHAR(255),
    logo_url            TEXT,
    settings            JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. USERS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email          VARCHAR(255) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL,
    phone          VARCHAR(50),
    role           user_role   NOT NULL DEFAULT 'RESIDENT',
    status         user_status NOT NULL DEFAULT 'ACTIVE',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, email)
);

-- ---------------------------------------------------------------------
-- 3. BUILDINGS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS buildings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    address         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 4. APARTMENTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS apartments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    building_id      UUID NOT NULL REFERENCES buildings(id)     ON DELETE CASCADE,
    tower            VARCHAR(50),
    entrance         VARCHAR(50),
    floor            INTEGER,
    apartment_number VARCHAR(50) NOT NULL,
    area_m2          NUMERIC(10,2),
    monthly_fee      NUMERIC(12,2) NOT NULL DEFAULT 0,
    status           apt_status NOT NULL DEFAULT 'OCCUPIED',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (building_id, apartment_number)
);

-- ---------------------------------------------------------------------
-- 5. RESIDENTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS residents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    apartment_id    UUID NOT NULL REFERENCES apartments(id)    ON DELETE CASCADE,
    user_id         UUID          REFERENCES users(id)         ON DELETE SET NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(50),
    email           VARCHAR(255),
    is_owner        BOOLEAN     NOT NULL DEFAULT FALSE,
    status          res_status  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 6. INVOICES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invoices (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    apartment_id     UUID NOT NULL REFERENCES apartments(id)    ON DELETE CASCADE,
    invoice_number   VARCHAR(100) NOT NULL,
    billing_year     INTEGER      NOT NULL,
    billing_month    INTEGER      NOT NULL,
    amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    due_date         DATE,
    status           inv_status   NOT NULL DEFAULT 'PENDING',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, apartment_id, billing_year, billing_month),
    CHECK (billing_month BETWEEN 1 AND 12)
);

-- ---------------------------------------------------------------------
-- 7. PAYMENTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    apartment_id    UUID    NOT NULL REFERENCES apartments(id)    ON DELETE CASCADE,
    invoice_id      UUID             REFERENCES invoices(id)      ON DELETE SET NULL,
    amount          NUMERIC(12,2) NOT NULL,
    payment_method  pay_method NOT NULL,
    transaction_id  VARCHAR(255),
    status          pay_status NOT NULL DEFAULT 'CONFIRMED',
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID             REFERENCES users(id)         ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 8. VEHICLES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vehicles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    apartment_id      UUID    NOT NULL REFERENCES apartments(id)    ON DELETE CASCADE,
    plate_number      VARCHAR(50) NOT NULL,
    vehicle_type      vehicle_type NOT NULL DEFAULT 'CAR',
    owner_name        VARCHAR(255),
    rfid_number       VARCHAR(100),
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    gate_access       BOOLEAN NOT NULL DEFAULT TRUE,
    access_started_at TIMESTAMPTZ,
    access_expires_at TIMESTAMPTZ,
    disabled_at       TIMESTAMPTZ,
    disabled_reason   TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, plate_number)
);

-- ---------------------------------------------------------------------
-- 9. GATE ACCESS LOGS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gate_access_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id      UUID             REFERENCES vehicles(id)      ON DELETE SET NULL,
    apartment_id    UUID             REFERENCES apartments(id)    ON DELETE SET NULL,
    action          gate_action NOT NULL,
    reason          TEXT,
    triggered_by    VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 10. BARRIER JOBS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS barrier_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id      UUID                   REFERENCES vehicles(id)      ON DELETE SET NULL,
    action          VARCHAR(100)  NOT NULL,
    status          barrier_status NOT NULL DEFAULT 'PENDING',
    attempts        INTEGER       NOT NULL DEFAULT 0,
    payload         JSONB                  DEFAULT '{}'::jsonb,
    last_error      TEXT,
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 11. VISITOR PASSES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS visitor_passes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    apartment_id    UUID        NOT NULL REFERENCES apartments(id)    ON DELETE CASCADE,
    created_by      UUID                 REFERENCES users(id)         ON DELETE SET NULL,
    visitor_name    VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    plate_number    VARCHAR(50),
    valid_from      TIMESTAMPTZ  NOT NULL,
    valid_until     TIMESTAMPTZ  NOT NULL,
    qr_code         TEXT,
    status          pass_status  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 12. MAINTENANCE REQUESTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    apartment_id    UUID           NOT NULL REFERENCES apartments(id)    ON DELETE CASCADE,
    created_by      UUID                    REFERENCES users(id)         ON DELETE SET NULL,
    title           VARCHAR(255)   NOT NULL,
    description     TEXT,
    category        maint_cat      NOT NULL DEFAULT 'OTHER',
    priority        maint_priority NOT NULL DEFAULT 'MEDIUM',
    status          maint_status   NOT NULL DEFAULT 'OPEN',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 13. MAINTENANCE COMMENTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS maintenance_comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    user_id    UUID          REFERENCES users(id)                ON DELETE SET NULL,
    comment    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 14. ANNOUNCEMENTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    image_url       TEXT,
    attachment_url  TEXT,
    published_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID             REFERENCES users(id)         ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 15. NOTIFICATIONS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    type            notif_type  NOT NULL DEFAULT 'SYSTEM',
    title           VARCHAR(255) NOT NULL,
    message         TEXT,
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 16. AUDIT LOGS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id        UUID          REFERENCES users(id)         ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID,
    old_data        JSONB,
    new_data        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
