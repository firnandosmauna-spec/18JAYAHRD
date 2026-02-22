-- Add monetary_percentage to reward_types table
ALTER TABLE public.reward_types ADD COLUMN IF NOT EXISTS monetary_percentage DECIMAL DEFAULT 0;

-- Update description to clarify it's a percentage of base salary
COMMENT ON COLUMN public.reward_types.monetary_percentage IS 'Persentase konversi nilai uang dari gaji pokok/base amount';
