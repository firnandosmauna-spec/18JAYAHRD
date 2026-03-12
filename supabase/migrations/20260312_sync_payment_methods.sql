-- Add payment_method_id to purchase_invoices and stock_movements
-- First, ensure the column doesn't already exist to avoid errors

-- 1. Update purchase_invoices
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id);

-- 2. Update stock_movements
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id);

-- (Optional) Attempt to migrate existing 'CASH'/'Hutang' data if counterparts exist
DO $$
DECLARE
    cash_id UUID;
    hutang_id UUID;
BEGIN
    SELECT id INTO cash_id FROM payment_methods WHERE name ILIKE '%Cash%' LIMIT 1;
    SELECT id INTO hutang_id FROM payment_methods WHERE name ILIKE '%Hutang%' OR name ILIKE '%Tempo%' LIMIT 1;

    -- Update purchase_invoices if possible (based on payment_status or notes)
    -- This is a bit risky if names don't match exactly, so we'll be cautious.
END $$;
