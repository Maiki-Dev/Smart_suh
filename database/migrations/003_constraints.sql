-- =====================================================================
-- 003_constraints.sql — Smart СӨХ Management System
-- Additional check constraints + updated_at triggers
-- =====================================================================

-- ---------------------------------------------------------------------
-- CHECK CONSTRAINTS
-- ---------------------------------------------------------------------

-- apartments — numeric fields positive
ALTER TABLE apartments
    DROP CONSTRAINT IF EXISTS apartments_area_m2_positive,
    ADD  CONSTRAINT apartments_area_m2_positive
        CHECK (area_m2 IS NULL OR area_m2 > 0);

ALTER TABLE apartments
    DROP CONSTRAINT IF EXISTS apartments_monthly_fee_not_negative,
    ADD  CONSTRAINT apartments_monthly_fee_not_negative
        CHECK (monthly_fee >= 0);

-- invoices — amounts
ALTER TABLE invoices
    DROP CONSTRAINT IF EXISTS invoices_amount_not_negative,
    ADD  CONSTRAINT invoices_amount_not_negative
        CHECK (amount >= 0);

ALTER TABLE invoices
    DROP CONSTRAINT IF EXISTS invoices_paid_amount_not_negative,
    ADD  CONSTRAINT invoices_paid_amount_not_negative
        CHECK (paid_amount >= 0);

ALTER TABLE invoices
    DROP CONSTRAINT IF EXISTS invoices_remaining_calc,
    ADD  CONSTRAINT invoices_remaining_calc
        CHECK (remaining_amount = amount - paid_amount);

ALTER TABLE invoices
    DROP CONSTRAINT IF EXISTS invoices_paid_le_amount,
    ADD  CONSTRAINT invoices_paid_le_amount
        CHECK (paid_amount <= amount);

-- payments — amount positive
ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_amount_positive,
    ADD  CONSTRAINT payments_amount_positive
        CHECK (amount > 0);

-- vehicles — access dates consistency
ALTER TABLE vehicles
    DROP CONSTRAINT IF EXISTS vehicles_access_dates_order,
    ADD  CONSTRAINT vehicles_access_dates_order
        CHECK (access_started_at IS NULL OR access_expires_at IS NULL
            OR access_started_at <= access_expires_at);

-- visitor_passes — valid date order
ALTER TABLE visitor_passes
    DROP CONSTRAINT IF EXISTS visitor_passes_valid_order,
    ADD  CONSTRAINT visitor_passes_valid_order
        CHECK (valid_from <= valid_until);

-- barrier_jobs — attempts not negative
ALTER TABLE barrier_jobs
    DROP CONSTRAINT IF EXISTS barrier_jobs_attempts_nonneg,
    ADD  CONSTRAINT barrier_jobs_attempts_nonneg
        CHECK (attempts >= 0);

-- residents — one owner per apartment (partial unique on is_owner=true)
DROP INDEX IF EXISTS idx_residents_one_owner;
CREATE UNIQUE INDEX idx_residents_one_owner
    ON residents(apartment_id) WHERE is_owner = TRUE;

-- vehicles — one default vehicle per apartment (partial unique)
DROP INDEX IF EXISTS idx_vehicles_one_default;
CREATE UNIQUE INDEX idx_vehicles_one_default
    ON vehicles(apartment_id) WHERE active = TRUE AND gate_access = TRUE;

-- ---------------------------------------------------------------------
-- UPDATED_AT TRIGGERS
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_buildings_updated_at ON buildings;
CREATE TRIGGER trg_buildings_updated_at
BEFORE UPDATE ON buildings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_apartments_updated_at ON apartments;
CREATE TRIGGER trg_apartments_updated_at
BEFORE UPDATE ON apartments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_residents_updated_at ON residents;
CREATE TRIGGER trg_residents_updated_at
BEFORE UPDATE ON residents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON vehicles;
CREATE TRIGGER trg_vehicles_updated_at
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_maint_updated_at ON maintenance_requests;
CREATE TRIGGER trg_maint_updated_at
BEFORE UPDATE ON maintenance_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON announcements;
CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- INVOICE REMAINING_AMOUNT AUTO-UPDATE TRIGGER
-- paid_amount changes -> remaining_amount recomputed
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recalc_invoice_remaining()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.remaining_amount := NEW.amount - NEW.paid_amount;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_invoices_recalc_remaining ON invoices;
CREATE TRIGGER trg_invoices_recalc_remaining
BEFORE INSERT OR UPDATE OF amount, paid_amount ON invoices
FOR EACH ROW EXECUTE FUNCTION recalc_invoice_remaining();
