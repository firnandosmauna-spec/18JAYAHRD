-- Fix historical unit_price in stock_movements
-- Records were incorrectly seeded with product.price instead of product.cost for 'in' movements

-- 1. For 'in' movements (or adjustments > 0), use product.cost
UPDATE stock_movements sm
SET unit_price = p.cost
FROM products p
WHERE sm.product_id = p.id 
  AND (sm.movement_type = 'in' OR (sm.movement_type = 'adjustment' AND sm.quantity > 0));

-- 2. For 'out' movements (or adjustments < 0), use product.price
UPDATE stock_movements sm
SET unit_price = p.price
FROM products p
WHERE sm.product_id = p.id 
  AND (sm.movement_type = 'out' OR (sm.movement_type = 'adjustment' AND sm.quantity < 0));

COMMENT ON COLUMN stock_movements.unit_price IS 'Harga satuan (Beli untuk IN, Jual untuk OUT) pada saat pergerakan stok';
