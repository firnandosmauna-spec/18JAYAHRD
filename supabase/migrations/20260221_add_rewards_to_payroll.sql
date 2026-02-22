-- Add reward_allowance and reward_details to payroll table
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS reward_allowance INTEGER DEFAULT 0;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS reward_details JSONB DEFAULT '[]'::jsonb;

-- Update existing records to have 0 and empty array if they don't have it
UPDATE public.payroll SET reward_allowance = 0 WHERE reward_allowance IS NULL;
UPDATE public.payroll SET reward_details = '[]'::jsonb WHERE reward_details IS NULL;
