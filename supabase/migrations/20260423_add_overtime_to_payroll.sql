-- Add missing columns to payroll table to support overtime and late deductions
ALTER TABLE public.payroll 
ADD COLUMN IF NOT EXISTS late_deduction NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_perfect_attendance BOOLEAN DEFAULT false;

-- Update existing records
UPDATE public.payroll SET late_deduction = 0 WHERE late_deduction IS NULL;
UPDATE public.payroll SET overtime_hours = 0 WHERE overtime_hours IS NULL;
UPDATE public.payroll SET overtime_rate = 0 WHERE overtime_rate IS NULL;
UPDATE public.payroll SET is_perfect_attendance = false WHERE is_perfect_attendance IS NULL;
