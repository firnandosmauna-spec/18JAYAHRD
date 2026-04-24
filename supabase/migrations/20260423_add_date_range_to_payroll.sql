-- Migration to add date range to payroll table
ALTER TABLE payroll
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN payroll.start_date IS 'Start of the attendance period for this payroll';
COMMENT ON COLUMN payroll.end_date IS 'End of the attendance period for this payroll';
