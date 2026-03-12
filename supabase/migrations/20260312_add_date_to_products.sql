-- Add date column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Update existing products to have a date based on created_at
UPDATE products SET date = created_at::DATE WHERE date IS NULL;
