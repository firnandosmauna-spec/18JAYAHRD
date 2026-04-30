-- Add latitude and longitude columns to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Update the RLS policies if necessary (usually not needed for just adding columns)
