CREATE TABLE guest_login_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  success      BOOLEAN NOT NULL,
  ip_address   TEXT,
  country      TEXT,
  country_code TEXT,
  city         TEXT,
  region       TEXT,
  browser      TEXT,
  browser_ver  TEXT,
  os           TEXT,
  device_type  TEXT,
  language     TEXT,
  user_agent   TEXT,
  error_msg    TEXT
);

ALTER TABLE guest_login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_read" ON guest_login_events FOR SELECT USING (false);
CREATE POLICY "allow_insert" ON guest_login_events FOR INSERT WITH CHECK (true);
