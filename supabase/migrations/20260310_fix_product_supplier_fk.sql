-- Ensure supplier_id column exists on products table
-- Then explicitly add the foreign key constraint
DO $$ 
BEGIN
    -- 1. Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'supplier_id'
    ) THEN
        ALTER TABLE products ADD COLUMN supplier_id UUID;
    END IF;

    -- 2. Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_supplier_id_fkey' 
        AND table_name = 'products'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT products_supplier_id_fkey 
        FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(id);
    END IF;

    -- 3. Create index if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'products' 
        AND indexname = 'idx_products_supplier_id'
    ) THEN
        CREATE INDEX idx_products_supplier_id ON products(supplier_id);
    END IF;
END $$;
