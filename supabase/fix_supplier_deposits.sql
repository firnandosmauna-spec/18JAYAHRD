-- FIX: Supplier Deposit Balance Synchronization
-- Run this in your Supabase SQL Editor

-- 1. Ensure the column exists in suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS deposit_balance NUMERIC(15, 2) DEFAULT 0;

-- 2. Create or Update the Trigger Function
-- This function calculates the delta (difference) and updates the supplier's balance.
CREATE OR REPLACE FUNCTION update_supplier_deposit_balance()
RETURNS TRIGGER AS $$
DECLARE
    delta NUMERIC(15, 2) := 0;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- If it's a new deposit, add to balance. If usage or refund, subtract.
        IF (NEW.type = 'deposit') THEN
            delta := NEW.amount;
        ELSE
            delta := -NEW.amount;
        END IF;
        UPDATE suppliers SET deposit_balance = COALESCE(deposit_balance, 0) + delta WHERE id = NEW.supplier_id;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Reverse old amount from previous state
        IF (OLD.type = 'deposit') THEN
            delta := -OLD.amount;
        ELSE
            delta := OLD.amount;
        END IF;
        
        -- Add new amount from current state
        IF (NEW.type = 'deposit') THEN
            delta := delta + NEW.amount;
        ELSE
            delta := delta - NEW.amount;
        END IF;
        
        UPDATE suppliers SET deposit_balance = COALESCE(deposit_balance, 0) + delta WHERE id = NEW.supplier_id;
        
    ELSIF (TG_OP = 'DELETE') THEN
        -- If deleting a deposit, subtract it. If deleting usage, add it back.
        IF (OLD.type = 'deposit') THEN
            delta := -OLD.amount;
        ELSE
            delta := OLD.amount;
        END IF;
        UPDATE suppliers SET deposit_balance = COALESCE(deposit_balance, 0) + delta WHERE id = OLD.supplier_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-install the Trigger
DROP TRIGGER IF EXISTS trg_update_supplier_deposit_balance ON supplier_deposits;
CREATE TRIGGER trg_update_supplier_deposit_balance
AFTER INSERT OR UPDATE OR DELETE ON supplier_deposits
FOR EACH ROW EXECUTE FUNCTION update_supplier_deposit_balance();

-- 4. RE-CALCULATE ALL BALANCES (Self-Healing)
-- This ensures all balances are 100% correct based on the transaction history.
UPDATE suppliers s
SET deposit_balance = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN sd.type = 'deposit' THEN sd.amount 
            ELSE -sd.amount 
        END
    ), 0)
    FROM supplier_deposits sd
    WHERE sd.supplier_id = s.id
);

-- Verification Query (Optional)
-- SELECT id, name, deposit_balance FROM suppliers ORDER BY deposit_balance DESC;
