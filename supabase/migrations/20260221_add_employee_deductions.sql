-- Add deductions column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deductions JSONB DEFAULT '[]';
