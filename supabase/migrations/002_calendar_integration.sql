-- Calendar Integration Migration
-- Adds support for cleaning jobs (trabajos), Google OAuth, and calendar synchronization

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Service types for cleaning jobs
CREATE TYPE tipo_servicio AS ENUM (
  'limpieza_general',
  'limpieza_profunda',
  'limpieza_oficina',
  'limpieza_cristales',
  'otros'
);

-- Job status
CREATE TYPE estado_trabajo AS ENUM (
  'pendiente',
  'en_progreso',
  'completado',
  'cancelado'
);

-- Sync status for Google Calendar integration
CREATE TYPE sync_status AS ENUM (
  'synced',
  'pending',
  'error'
);

-- ============================================================================
-- TABLE: trabajos (Cleaning Jobs)
-- ============================================================================

CREATE TABLE trabajos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,

  -- Job details
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo_servicio tipo_servicio NOT NULL DEFAULT 'limpieza_general',
  estado estado_trabajo NOT NULL DEFAULT 'pendiente',

  -- Schedule
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,

  -- Location
  direccion TEXT, -- Can override client's address

  -- Pricing
  precio_acordado DECIMAL(10, 2),

  -- Recurring pattern (for UI display and grouping)
  es_recurrente BOOLEAN DEFAULT FALSE,
  recurrencia_patron TEXT, -- 'weekly', 'biweekly', 'monthly'
  recurrencia_padre_id UUID REFERENCES trabajos(id) ON DELETE SET NULL,

  -- Invoice linking
  factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (fecha_fin > fecha_inicio)
);

-- Indexes for trabajos
CREATE INDEX idx_trabajos_user_id ON trabajos(user_id);
CREATE INDEX idx_trabajos_cliente_id ON trabajos(cliente_id);
CREATE INDEX idx_trabajos_fecha_inicio ON trabajos(fecha_inicio);
CREATE INDEX idx_trabajos_estado ON trabajos(estado);
CREATE INDEX idx_trabajos_factura_id ON trabajos(factura_id);
CREATE INDEX idx_trabajos_recurrencia_padre ON trabajos(recurrencia_padre_id);

-- RLS Policies for trabajos
ALTER TABLE trabajos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trabajos"
  ON trabajos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trabajos"
  ON trabajos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trabajos"
  ON trabajos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trabajos"
  ON trabajos FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger for trabajos
CREATE TRIGGER update_trabajos_updated_at
  BEFORE UPDATE ON trabajos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: google_oauth_tokens (OAuth Credentials)
-- ============================================================================

CREATE TABLE google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens (store encrypted)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,

  -- Scope and calendar info
  scope TEXT[] NOT NULL,
  calendar_id TEXT, -- Google Calendar ID (usually 'primary')

  -- Sync status
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One token set per user
  UNIQUE (user_id)
);

-- Indexes for google_oauth_tokens
CREATE INDEX idx_google_oauth_tokens_user_id ON google_oauth_tokens(user_id);
CREATE INDEX idx_google_oauth_tokens_expiry ON google_oauth_tokens(token_expiry);

-- RLS Policies for google_oauth_tokens
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON google_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON google_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON google_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON google_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger for google_oauth_tokens
CREATE TRIGGER update_google_oauth_tokens_updated_at
  BEFORE UPDATE ON google_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: calendario_sync (Sync State Tracking)
-- ============================================================================

CREATE TABLE calendario_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trabajo_id UUID NOT NULL REFERENCES trabajos(id) ON DELETE CASCADE,

  -- Google Calendar event ID
  google_event_id TEXT NOT NULL,

  -- Sync tracking
  sync_status sync_status NOT NULL DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One sync record per job
  UNIQUE (trabajo_id)
);

-- Indexes for calendario_sync
CREATE INDEX idx_calendario_sync_user_id ON calendario_sync(user_id);
CREATE INDEX idx_calendario_sync_trabajo_id ON calendario_sync(trabajo_id);
CREATE INDEX idx_calendario_sync_google_event_id ON calendario_sync(google_event_id);
CREATE INDEX idx_calendario_sync_status ON calendario_sync(sync_status);

-- RLS Policies for calendario_sync
ALTER TABLE calendario_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync records"
  ON calendario_sync FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync records"
  ON calendario_sync FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync records"
  ON calendario_sync FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync records"
  ON calendario_sync FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger for calendario_sync
CREATE TRIGGER update_calendario_sync_updated_at
  BEFORE UPDATE ON calendario_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
