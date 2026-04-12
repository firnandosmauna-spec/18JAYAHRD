-- Add approval fields for slik_ojk in consumer_pemberkasan table
ALTER TABLE consumer_pemberkasan
ADD COLUMN IF NOT EXISTS slik_ojk_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS slik_ojk_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS slik_ojk_approved_at TIMESTAMPTZ;

-- Add comment to explain the field
COMMENT ON COLUMN consumer_pemberkasan.slik_ojk_status IS 'Status of SLIK OJK approval: none, pending, approved, rejected';
