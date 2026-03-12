-- Final consolidate migration for price history
CREATE TABLE IF NOT EXISTS product_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_cost DECIMAL(15, 2),
    new_cost DECIMAL(15, 2),
    old_price DECIMAL(15, 2),
    new_price DECIMAL(15, 2),
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed')),
    adjustment_value DECIMAL(15, 2) NOT NULL,
    target_field TEXT NOT NULL CHECK (target_field IN ('cost', 'price', 'both')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON product_price_history(created_at);

ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read price history" ON product_price_history;
CREATE POLICY "Allow authenticated users to read price history"
ON product_price_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert price history" ON product_price_history;
CREATE POLICY "Allow authenticated users to insert price history"
ON product_price_history FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update price history" ON product_price_history;
CREATE POLICY "Allow authenticated users to update price history"
ON product_price_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete price history" ON product_price_history;
CREATE POLICY "Allow authenticated users to delete price history"
ON product_price_history FOR DELETE TO authenticated USING (true);
