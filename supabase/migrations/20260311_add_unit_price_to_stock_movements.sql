-- Add unit_price column to stock_movements table
ALTER TABLE stock_movements ADD COLUMN unit_price DECIMAL(15,2) DEFAULT 0;

-- Optional: Update existing records with current product price
UPDATE stock_movements sm
SET unit_price = p.price
FROM products p
WHERE sm.product_id = p.id AND (sm.unit_price IS NULL OR sm.unit_price = 0);

-- Make it not null after seeding if preferred, but leaving as default 0 for flexibility
COMMENT ON COLUMN stock_movements.unit_price IS 'Harga satuan pada saat pergerakan stok terjadi';
