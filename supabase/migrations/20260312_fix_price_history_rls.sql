-- Add missing RLS policies for product_price_history to enable CRUD
CREATE POLICY "Allow authenticated users to update price history"
ON product_price_history FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete price history"
ON product_price_history FOR DELETE
TO authenticated
USING (true);
