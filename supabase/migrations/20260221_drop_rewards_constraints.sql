-- Drop hardcoded check constraints on rewards table to allow dynamic reward types and statuses
ALTER TABLE public.rewards DROP CONSTRAINT IF EXISTS rewards_type_check;
ALTER TABLE public.rewards DROP CONSTRAINT IF EXISTS rewards_status_check;

-- Note: We are keeping the VARCHAR(30) length for the type column, 
-- but removing the check constraint that limited it to a fixed list.
