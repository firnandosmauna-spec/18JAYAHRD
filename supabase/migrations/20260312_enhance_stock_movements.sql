-- Enhance stock_movements table with project_location and movement_category
-- This supports the expanded 11-column report

-- 1. Add columns if they don't exist
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS project_location TEXT,
ADD COLUMN IF NOT EXISTS movement_category TEXT CHECK (movement_category IN ('Keluar', 'Pemakaian'));

-- 2. Update existing entries to have a default category if they are 'out' movements
UPDATE stock_movements 
SET movement_category = 'Keluar' 
WHERE movement_type = 'out' AND movement_category IS NULL;

-- 3. (Optional) Indexes for better performance on reporting
CREATE INDEX IF NOT EXISTS idx_stock_movements_project_location ON stock_movements(project_location);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_category ON stock_movements(movement_category);
