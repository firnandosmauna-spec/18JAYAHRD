-- Add allowances column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances JSONB DEFAULT '[]';
