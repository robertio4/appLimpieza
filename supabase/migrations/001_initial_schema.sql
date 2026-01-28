-- Limpieza App - Initial Database Schema
-- Migration: 001_initial_schema.sql

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE estado_factura AS ENUM ('borrador', 'enviada', 'pagada');

-- =============================================================================
-- TABLES
-- =============================================================================

-- Clientes (Clients)
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    direccion TEXT,
    nif TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Facturas (Invoices)
CREATE TABLE facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    iva NUMERIC(5, 2) NOT NULL DEFAULT 21,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    estado estado_factura NOT NULL DEFAULT 'borrador',
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT facturas_numero_user_unique UNIQUE (user_id, numero)
);

-- Lineas de Factura (Invoice Lines)
CREATE TABLE lineas_factura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- Categorias de Gasto (Expense Categories)
CREATE TABLE categorias_gasto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280'
);

-- Gastos (Expenses)
CREATE TABLE gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    concepto TEXT NOT NULL,
    categoria_id UUID REFERENCES categorias_gasto(id) ON DELETE SET NULL,
    importe NUMERIC(12, 2) NOT NULL DEFAULT 0,
    proveedor TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_clientes_user_id ON clientes(user_id);
CREATE INDEX idx_facturas_user_id ON facturas(user_id);
CREATE INDEX idx_facturas_cliente_id ON facturas(cliente_id);
CREATE INDEX idx_facturas_fecha ON facturas(fecha);
CREATE INDEX idx_facturas_estado ON facturas(estado);
CREATE INDEX idx_lineas_factura_factura_id ON lineas_factura(factura_id);
CREATE INDEX idx_categorias_gasto_user_id ON categorias_gasto(user_id);
CREATE INDEX idx_gastos_user_id ON gastos(user_id);
CREATE INDEX idx_gastos_categoria_id ON gastos(categoria_id);
CREATE INDEX idx_gastos_fecha ON gastos(fecha);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER trigger_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_facturas_updated_at
    BEFORE UPDATE ON facturas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_gastos_updated_at
    BEFORE UPDATE ON gastos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INVOICE NUMBER GENERATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    invoice_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

    -- Get the next invoice number for this user in the current year
    SELECT COALESCE(MAX(
        CASE
            WHEN numero ~ ('^' || current_year || '-[0-9]+$')
            THEN CAST(SPLIT_PART(numero, '-', 2) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM facturas
    WHERE user_id = p_user_id
    AND numero LIKE current_year || '-%';

    -- Format: YYYY-NNNN (e.g., 2026-0001)
    invoice_number := current_year || '-' || LPAD(next_number::TEXT, 4, '0');

    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Clientes policies
CREATE POLICY "Users can view their own clients"
    ON clientes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
    ON clientes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
    ON clientes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
    ON clientes FOR DELETE
    USING (auth.uid() = user_id);

-- Facturas policies
CREATE POLICY "Users can view their own invoices"
    ON facturas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
    ON facturas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
    ON facturas FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
    ON facturas FOR DELETE
    USING (auth.uid() = user_id);

-- Lineas de factura policies (based on parent factura ownership)
CREATE POLICY "Users can view their own invoice lines"
    ON lineas_factura FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM facturas
            WHERE facturas.id = lineas_factura.factura_id
            AND facturas.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert lines to their own invoices"
    ON lineas_factura FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM facturas
            WHERE facturas.id = lineas_factura.factura_id
            AND facturas.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update lines in their own invoices"
    ON lineas_factura FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM facturas
            WHERE facturas.id = lineas_factura.factura_id
            AND facturas.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM facturas
            WHERE facturas.id = lineas_factura.factura_id
            AND facturas.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete lines from their own invoices"
    ON lineas_factura FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM facturas
            WHERE facturas.id = lineas_factura.factura_id
            AND facturas.user_id = auth.uid()
        )
    );

-- Categorias de gasto policies
CREATE POLICY "Users can view their own expense categories"
    ON categorias_gasto FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense categories"
    ON categorias_gasto FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense categories"
    ON categorias_gasto FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense categories"
    ON categorias_gasto FOR DELETE
    USING (auth.uid() = user_id);

-- Gastos policies
CREATE POLICY "Users can view their own expenses"
    ON gastos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
    ON gastos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
    ON gastos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
    ON gastos FOR DELETE
    USING (auth.uid() = user_id);
