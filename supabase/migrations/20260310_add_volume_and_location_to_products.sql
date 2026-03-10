-- Migration to add volume and project_location to products table
-- Run this in your Supabase SQL Editor

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS volume VARCHAR(100),
ADD COLUMN IF NOT EXISTS project_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS purchase_payment_method VARCHAR(20) DEFAULT 'CASH' CHECK (purchase_payment_method IN ('CASH', 'Hutang'));

-- Optional: Add comments to columns
COMMENT ON COLUMN products.volume IS 'Volume standar produk (misal: 10 kg, 1 m3)';
COMMENT ON COLUMN products.project_location IS 'Lokasi proyek penempatan material';
