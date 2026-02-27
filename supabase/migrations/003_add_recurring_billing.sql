-- Migración: Agregar facturación recurrente a clientes
-- Fecha: 2026-02-27
-- Descripción: Permite marcar clientes con facturación mensual recurrente

-- Agregar campos de facturación recurrente a tabla clientes
ALTER TABLE clientes
ADD COLUMN facturacion_recurrente BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN dia_facturacion INTEGER,
ADD CONSTRAINT clientes_facturacion_recurrente_check
  CHECK (
    facturacion_recurrente = FALSE
    OR (dia_facturacion IS NOT NULL AND dia_facturacion >= 1 AND dia_facturacion <= 31)
  );

-- Índice para búsquedas eficientes de clientes recurrentes
-- Solo indexa clientes con facturacion_recurrente = TRUE para optimizar
CREATE INDEX idx_clientes_facturacion_recurrente
ON clientes(user_id, facturacion_recurrente)
WHERE facturacion_recurrente = TRUE;

-- Comentarios para documentación
COMMENT ON COLUMN clientes.facturacion_recurrente IS 'Indica si este cliente tiene facturación recurrente mensual';
COMMENT ON COLUMN clientes.dia_facturacion IS 'Día del mes (1-31) para generar factura automáticamente. Para meses con menos días, se usa el último día disponible.';
