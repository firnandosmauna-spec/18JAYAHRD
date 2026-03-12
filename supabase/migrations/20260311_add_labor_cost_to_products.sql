-- Migration to add labor_cost to products for craftsman salary settings
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS labor_cost NUMERIC DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN products.labor_cost IS 'Biaya gaji tukang (piece-rate) per unit produk';
