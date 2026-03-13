-- Migration to enhance project_worker_payments with comprehensive fields
ALTER TABLE project_worker_payments 
ADD COLUMN IF NOT EXISTS working_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_deduction DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS activity_detail TEXT,
ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS worker_count INTEGER DEFAULT 0;

-- Update existing records to have consistent data
UPDATE project_worker_payments SET total_salary = amount WHERE total_salary IS NULL;
