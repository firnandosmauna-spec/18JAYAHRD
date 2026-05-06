-- Update housing_units table to support custom locations
ALTER TABLE housing_units ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE housing_units ALTER COLUMN project_id DROP NOT NULL;

-- If project_id is set, try to fill location_name from projects table for existing records
UPDATE housing_units hu
SET location_name = p.name
FROM projects p
WHERE hu.project_id = p.id AND hu.location_name IS NULL;
