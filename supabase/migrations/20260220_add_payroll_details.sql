-- Add new columns to payroll table for detailed component breakdown
ALTER TABLE payroll
ADD COLUMN IF NOT EXISTS gasoline_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS meal_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS position_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discretionary_allowance NUMERIC DEFAULT 0, -- Uang Bijak
ADD COLUMN IF NOT EXISTS thr_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS bpjs_deduction NUMERIC DEFAULT 0, -- BPJS treated as deduction
ADD COLUMN IF NOT EXISTS absent_deduction NUMERIC DEFAULT 0, -- Potongan Absen
ADD COLUMN IF NOT EXISTS bank_account_details TEXT; -- No. Rekening

-- Update metrics for existing rows if needed (optional, just defaults are fine)
