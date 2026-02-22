-- Add manual item details to payroll table
ALTER TABLE payroll 
ADD COLUMN IF NOT EXISTS manual_allowance_details JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS manual_deduction_details JSONB DEFAULT '[]';
