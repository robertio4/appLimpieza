-- Limpieza App - Guest Login Tracking
-- Migration: 003_guest_login_events.sql
-- Adds guest login event tracking table for server-side observability

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE guest_login_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  success         BOOLEAN NOT NULL,
  -- Red
  ip_address      TEXT,
  -- Geolocalización (ipapi.co)
  country         TEXT,
  country_code    TEXT,
  city            TEXT,
  region          TEXT,
  region_code     TEXT,
  postal          TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  timezone        TEXT,
  org             TEXT,
  in_eu           BOOLEAN,
  -- Dispositivo
  browser         TEXT,
  browser_ver     TEXT,
  os              TEXT,
  device_type     TEXT,
  language        TEXT,
  user_agent      TEXT,
  error_msg       TEXT
);

CREATE INDEX idx_guest_login_events_user_id ON guest_login_events(user_id);
CREATE INDEX idx_guest_login_events_created_at ON guest_login_events(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE guest_login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_read" ON guest_login_events FOR SELECT USING (false);
CREATE POLICY "authenticated_insert_own_events"
  ON guest_login_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
