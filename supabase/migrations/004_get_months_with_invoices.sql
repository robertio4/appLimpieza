-- Add get_months_with_invoices function for server-side aggregation
-- This replaces the previous in-memory aggregation approach

CREATE OR REPLACE FUNCTION get_months_with_invoices()
RETURNS TABLE (year integer, month integer, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXTRACT(YEAR FROM fecha)::integer AS year,
    EXTRACT(MONTH FROM fecha)::integer AS month,
    COUNT(*)::bigint AS count
  FROM facturas
  WHERE user_id = auth.uid()
  GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha)
  ORDER BY EXTRACT(YEAR FROM fecha) DESC, EXTRACT(MONTH FROM fecha) DESC;
$$;

GRANT EXECUTE ON FUNCTION get_months_with_invoices() TO authenticated;
