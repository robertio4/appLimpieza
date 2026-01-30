-- Fix race condition in invoice number generation
-- Migration: 002_fix_race_condition.sql
-- This migration adds advisory locking to prevent duplicate invoice numbers
-- when multiple invoices are created concurrently.

CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    invoice_number TEXT;
    lock_key BIGINT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Create a deterministic lock key from user_id and year
    -- This ensures each user+year combination has its own lock
    lock_key := hashtext(p_user_id::TEXT || '-' || current_year);
    
    -- Acquire advisory lock to prevent race conditions
    -- This lock is automatically released at the end of the transaction
    PERFORM pg_advisory_xact_lock(lock_key);

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
