-- =====================================================================
-- 012_building_incidents.sql — AI Incident Detector & Smart Clustering
-- Extends maintenance_requests (no parallel ticket system)
-- =====================================================================

SET TIME ZONE 'Asia/Ulaanbaatar';

DO $$ BEGIN
    CREATE TYPE incident_issue_type AS ENUM (
        'WATER_LEAK', 'NO_WATER', 'LOW_WATER_PRESSURE', 'ELECTRICITY',
        'ELEVATOR', 'HEATING', 'SECURITY', 'PARKING', 'NOISE', 'CLEANING',
        'FIRE_SAFETY', 'GAS', 'OTHER'
    );
    CREATE TYPE incident_status AS ENUM (
        'DETECTED', 'INVESTIGATING', 'CONFIRMED', 'IN_PROGRESS',
        'MONITORING', 'RESOLVED', 'FALSE_POSITIVE'
    );
    CREATE TYPE incident_detection_source AS ENUM ('AI', 'RULE_BASED', 'MANUAL');
    CREATE TYPE incident_location_match AS ENUM (
        'SAME_APARTMENT', 'SAME_FLOOR', 'ADJACENT_FLOOR',
        'SAME_ENTRANCE', 'SAME_BUILDING'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- BUILDING INCIDENTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS building_incidents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    building_id         UUID REFERENCES buildings(id) ON DELETE SET NULL,
    incident_number     VARCHAR(50) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    category            incident_issue_type NOT NULL DEFAULT 'OTHER',
    priority            maint_priority NOT NULL DEFAULT 'MEDIUM',
    status              incident_status NOT NULL DEFAULT 'DETECTED',
    description         TEXT,
    detection_source    incident_detection_source NOT NULL DEFAULT 'RULE_BASED',
    confidence_score    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
    affected_area       JSONB NOT NULL DEFAULT '{}'::jsonb,
    report_count        INTEGER NOT NULL DEFAULT 0,
    affected_apartment_count INTEGER NOT NULL DEFAULT 0,
    floor_min           INTEGER,
    floor_max           INTEGER,
    assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at        TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, incident_number)
);

-- ---------------------------------------------------------------------
-- LINK MAINTENANCE REQUESTS ↔ INCIDENTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS incident_issues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID NOT NULL REFERENCES building_incidents(id) ON DELETE CASCADE,
    issue_id        UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    similarity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    location_match  incident_location_match,
    linked_by       VARCHAR(50) NOT NULL DEFAULT 'AUTO',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (incident_id, issue_id),
    UNIQUE (issue_id)
);

-- ---------------------------------------------------------------------
-- AFFECTED AREAS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS incident_affected_areas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID NOT NULL REFERENCES building_incidents(id) ON DELETE CASCADE,
    building_id     UUID REFERENCES buildings(id) ON DELETE SET NULL,
    entrance        VARCHAR(50),
    floor           INTEGER,
    apartment_id    UUID REFERENCES apartments(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (incident_id, apartment_id)
);

-- ---------------------------------------------------------------------
-- TIMELINE
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS incident_timeline (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID NOT NULL REFERENCES building_incidents(id) ON DELETE CASCADE,
    event_type      VARCHAR(100) NOT NULL,
    description     TEXT NOT NULL,
    actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- EXTEND MAINTENANCE REQUESTS
-- ---------------------------------------------------------------------

ALTER TABLE maintenance_requests
    ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES building_incidents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS detected_issue_type incident_issue_type;

CREATE INDEX IF NOT EXISTS idx_maint_incident ON maintenance_requests(incident_id) WHERE incident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maint_detected_type ON maintenance_requests(detected_issue_type);
CREATE INDEX IF NOT EXISTS idx_building_incidents_org_status ON building_incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_building_incidents_detected ON building_incidents(organization_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_issues_incident ON incident_issues(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident ON incident_timeline(incident_id, created_at DESC);

DO $$ BEGIN
    CREATE TRIGGER trg_building_incidents_updated
        BEFORE UPDATE ON building_incidents
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
