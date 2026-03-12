-- Cleanup duplicate payment methods (keep the latest one)
DELETE FROM payment_methods a
USING payment_methods b
WHERE a.id < b.id
AND a.name = b.name;

-- Add UNIQUE constraint to name column to prevent future duplicates
ALTER TABLE payment_methods ADD CONSTRAINT unique_payment_method_name UNIQUE (name);
