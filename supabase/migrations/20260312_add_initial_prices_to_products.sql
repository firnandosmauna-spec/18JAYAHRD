-- Add initial price and cost columns to products table
-- This allows tracking the starting price vs current price
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS initial_price DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS initial_cost DECIMAL(15, 2);

-- Initialize initial values with current values for existing products
UPDATE products 
SET 
  initial_price = price,
  initial_cost = cost
WHERE initial_price IS NULL OR initial_cost IS NULL;

-- Create a function to set initial values on insert if not provided
CREATE OR REPLACE FUNCTION set_initial_product_values()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.initial_price IS NULL THEN
    NEW.initial_price := NEW.price;
  END IF;
  IF NEW.initial_cost IS NULL THEN
    NEW.initial_cost := NEW.cost;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tr_set_initial_product_values ON products;
CREATE TRIGGER tr_set_initial_product_values
BEFORE INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION set_initial_product_values();
