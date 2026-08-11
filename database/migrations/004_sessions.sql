-- =====================================================================
-- 004_sessions.sql — Server-side authentication sessions
-- =====================================================================

SET TIME ZONE 'Asia/Ulaanbaatar';

CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token   TEXT NOT NULL UNIQUE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user        ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_org         ON sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token       ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires     ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(organization_id, last_active_at DESC);

-- ---------------------------------------------------------------------
-- Helper procedure — prune expired sessions (call periodically)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prune_expired_sessions()
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
    deleted BIGINT;
BEGIN
    WITH removed AS (
        DELETE FROM sessions WHERE expires_at < NOW() RETURNING 1
    )
    SELECT COUNT(*) INTO deleted FROM removed;
    RETURN deleted;
END; $$;
