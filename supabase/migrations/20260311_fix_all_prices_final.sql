-- 1. Fix historical unit_price in stock_movements
-- Stock IN: use Product COST
UPDATE stock_movements m
SET unit_price = p.cost
FROM products p
WHERE m.product_id = p.id
AND m.movement_type = 'in'
AND (m.unit_price = 50000 OR m.unit_price IS NULL OR m.unit_price = 0);

-- Stock OUT: use Product PRICE (Selling Price)
UPDATE stock_movements m
SET unit_price = p.price
FROM products p
WHERE m.product_id = p.id
AND m.movement_type = 'out'
AND (m.unit_price = 50000 OR m.unit_price IS NULL OR m.unit_price = 0);

-- 2. Clean up any 50000 placeholders in the products table itself
-- If cost is 50000, set to 0 (so fallback logic can work or user can manually update)
UPDATE products 
SET cost = 0 
WHERE cost = 50000;

-- If price is 50000, set to 0
UPDATE products 
SET price = 0 
WHERE price = 50000;

-- 3. Verify the changes
SELECT m.movement_type, m.unit_price, p.name, p.cost, p.price
FROM stock_movements m
JOIN products p ON m.product_id = p.id
WHERE m.unit_price = 50000;
