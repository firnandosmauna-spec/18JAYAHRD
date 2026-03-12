-- Aggressive Deduplication and Normalization of Payment Methods

-- 1. Create a temporary mapping of names to their "canonical" (master) ID
-- We choose the oldest ID (created_at) as the master to maintain history where possible
CREATE TEMP TABLE payment_method_mapping AS
WITH NormalizedMethods AS (
    SELECT 
        id,
        TRIM(name) as clean_name,
        created_at
    FROM payment_methods
),
MasterIDs AS (
    SELECT 
        clean_name,
        FIRST_VALUE(id) OVER (PARTITION BY LOWER(clean_name) ORDER BY created_at ASC) as master_id
    FROM NormalizedMethods
)
SELECT DISTINCT clean_name, master_id FROM MasterIDs;

-- 2. Update stock_movements to point to the master IDs
UPDATE stock_movements sm
SET payment_method_id = mapping.master_id
FROM payment_methods pm
JOIN payment_method_mapping mapping ON LOWER(TRIM(pm.name)) = LOWER(mapping.clean_name)
WHERE sm.payment_method_id = pm.id;

-- 3. Update purchase_invoices to point to the master IDs
UPDATE purchase_invoices pi
SET payment_method_id = mapping.master_id
FROM payment_methods pm
JOIN payment_method_mapping mapping ON LOWER(TRIM(pm.name)) = LOWER(mapping.clean_name)
WHERE pi.payment_method_id = pm.id;

-- 4. Delete the duplicate payment methods that are not master IDs
DELETE FROM payment_methods
WHERE id NOT IN (SELECT master_id FROM payment_method_mapping);

-- 5. Normalize the names of the remaining (master) payment methods
UPDATE payment_methods
SET name = TRIM(name);

-- 6. Ensure the UNIQUE constraint exists (case-insensitive if possible, otherwise standard)
-- First drop existing constraint if any
ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS unique_payment_method_name;

-- Standardize names to prevent future duplicates (case-insensitive approach via unique index)
CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_name_lower_idx ON payment_methods (LOWER(TRIM(name)));

-- 7. Backfill payment_method_id for legacy records in stock_movements if possible
-- (e.g., if notes contain hints, but we'll stick to explicit mappings for now)

DROP TABLE payment_method_mapping;
