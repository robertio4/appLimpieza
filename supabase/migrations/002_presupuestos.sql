-- Limpieza App - Presupuestos Migration
-- Migration: 002_presupuestos.sql
-- Adds quote/estimate functionality with conversion to invoices

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE estado_presupuesto AS ENUM ('pendiente', 'aceptado', 'rechazado', 'expirado');

-- =============================================================================
-- TABLES
-- =============================================================================

-- Presupuestos (Quotes/Estimates)
CREATE TABLE presupuestos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_validez DATE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    iva NUMERIC(5, 2) NOT NULL DEFAULT 21,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    estado estado_presupuesto NOT NULL DEFAULT 'pendiente',
    notas TEXT,
    factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT presupuestos_numero_user_unique UNIQUE (user_id, numero)
);

-- Lineas de Presupuesto (Quote Lines)
CREATE TABLE lineas_presupuesto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presupuesto_id UUID NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_presupuestos_user_id ON presupuestos(user_id);
CREATE INDEX idx_presupuestos_cliente_id ON presupuestos(cliente_id);
CREATE INDEX idx_presupuestos_fecha ON presupuestos(fecha);
CREATE INDEX idx_presupuestos_estado ON presupuestos(estado);
CREATE INDEX idx_presupuestos_factura_id ON presupuestos(factura_id);
CREATE INDEX idx_lineas_presupuesto_presupuesto_id ON lineas_presupuesto(presupuesto_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

-- Apply updated_at trigger to presupuestos table
CREATE TRIGGER trigger_presupuestos_updated_at
    BEFORE UPDATE ON presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PRESUPUESTO NUMBER GENERATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_presupuesto_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    presupuesto_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

    -- Get the next presupuesto number for this user in the current year
    SELECT COALESCE(MAX(
        CASE
            WHEN numero ~ ('^PRE-' || current_year || '-[0-9]+$')
            THEN CAST(SPLIT_PART(numero, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM presupuestos
    WHERE user_id = p_user_id
    AND numero LIKE 'PRE-' || current_year || '-%';

    -- Format: PRE-YYYY-NNNN (e.g., PRE-2026-0001)
    presupuesto_number := 'PRE-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');

    RETURN presupuesto_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on presupuesto tables
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_presupuesto ENABLE ROW LEVEL SECURITY;

-- Presupuestos policies
CREATE POLICY "Users can view their own quotes"
    ON presupuestos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quotes"
    ON presupuestos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes"
    ON presupuestos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes"
    ON presupuestos FOR DELETE
    USING (auth.uid() = user_id);

-- Lineas de presupuesto policies (based on parent presupuesto ownership)
CREATE POLICY "Users can view their own quote lines"
    ON lineas_presupuesto FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM presupuestos
            WHERE presupuestos.id = lineas_presupuesto.presupuesto_id
            AND presupuestos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert lines to their own quotes"
    ON lineas_presupuesto FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM presupuestos
            WHERE presupuestos.id = lineas_presupuesto.presupuesto_id
            AND presupuestos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update lines in their own quotes"
    ON lineas_presupuesto FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM presupuestos
            WHERE presupuestos.id = lineas_presupuesto.presupuesto_id
            AND presupuestos.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM presupuestos
            WHERE presupuestos.id = lineas_presupuesto.presupuesto_id
            AND presupuestos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete lines from their own quotes"
    ON lineas_presupuesto FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM presupuestos
            WHERE presupuestos.id = lineas_presupuesto.presupuesto_id
            AND presupuestos.user_id = auth.uid()
        )
    );
