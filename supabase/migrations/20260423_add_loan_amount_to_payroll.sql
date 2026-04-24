-- Add loan_amount to payroll table
-- Execute this in Supabase SQL Editor if not already applied
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS loan_amount NUMERIC DEFAULT 0;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
