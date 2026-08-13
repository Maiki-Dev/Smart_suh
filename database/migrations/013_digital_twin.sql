-- Digital Twin: health snapshots + building events for historical playback

CREATE TYPE apt_health_status AS ENUM ('HEALTHY', 'WARNING', 'CRITICAL', 'INACTIVE');

CREATE TABLE building_health_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  health_score    NUMERIC(5,2) NOT NULL,
  health_grade    VARCHAR(20) NOT NULL,
  payment_health  NUMERIC(5,2) NOT NULL DEFAULT 0,
  issue_health    NUMERIC(5,2) NOT NULL DEFAULT 0,
  incident_health NUMERIC(5,2) NOT NULL DEFAULT 0,
  maintenance_health NUMERIC(5,2) NOT NULL DEFAULT 0,
  parking_health  NUMERIC(5,2) NOT NULL DEFAULT 0,
  payment_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  open_issues     INT NOT NULL DEFAULT 0,
  active_incidents INT NOT NULL DEFAULT 0,
  resident_count  INT NOT NULL DEFAULT 0,
  vehicle_count   INT NOT NULL DEFAULT 0,
  apartment_count INT NOT NULL DEFAULT 0,
  metrics         JSONB NOT NULL DEFAULT '{}',
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE apartment_health_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  health_score    NUMERIC(5,2) NOT NULL,
  status          apt_health_status NOT NULL,
  payment_status  VARCHAR(20),
  open_issue_count INT NOT NULL DEFAULT 0,
  incident_count  INT NOT NULL DEFAULT 0,
  parking_status  VARCHAR(20),
  maintenance_status VARCHAR(20),
  resident_count  INT NOT NULL DEFAULT 0,
  layer_data      JSONB NOT NULL DEFAULT '{}',
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE building_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  building_id     UUID REFERENCES buildings(id) ON DELETE SET NULL,
  apartment_id    UUID REFERENCES apartments(id) ON DELETE SET NULL,
  incident_id     UUID REFERENCES building_incidents(id) ON DELETE SET NULL,
  maintenance_id  UUID REFERENCES maintenance_requests(id) ON DELETE SET NULL,
  event_type      VARCHAR(50) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  source          VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_building_health_snapshots_building_recorded
  ON building_health_snapshots (building_id, recorded_at DESC);

CREATE INDEX idx_building_health_snapshots_org_recorded
  ON building_health_snapshots (organization_id, recorded_at DESC);

CREATE INDEX idx_apartment_health_snapshots_building_recorded
  ON apartment_health_snapshots (building_id, recorded_at DESC);

CREATE INDEX idx_apartment_health_snapshots_apartment_recorded
  ON apartment_health_snapshots (apartment_id, recorded_at DESC);

CREATE INDEX idx_building_events_building_occurred
  ON building_events (building_id, occurred_at DESC);

CREATE INDEX idx_building_events_org_occurred
  ON building_events (organization_id, occurred_at DESC);

CREATE INDEX idx_building_events_apartment_occurred
  ON building_events (apartment_id, occurred_at DESC) WHERE apartment_id IS NOT NULL;
