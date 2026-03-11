-- Add payment_method to suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'Hutang'));
