-- Add supplier_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
