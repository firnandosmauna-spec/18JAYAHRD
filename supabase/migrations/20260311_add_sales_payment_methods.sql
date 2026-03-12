-- Add sales_payment_method to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_payment_method TEXT DEFAULT 'CASH';

-- Add preferred_payment_method to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT DEFAULT 'CASH';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_debt NUMERIC DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deposit_balance NUMERIC DEFAULT 0;

-- Add payment_method to sales_orders
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'CASH';

-- Add payment_method to sales_invoices
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'CASH';

-- Update existing products to have CASH as default sales payment method
UPDATE products SET sales_payment_method = 'CASH' WHERE sales_payment_method IS NULL;

-- Update existing customers to have CASH as default preferred payment method
UPDATE customers SET preferred_payment_method = 'CASH' WHERE preferred_payment_method IS NULL;

-- Update existing orders and invoices
UPDATE sales_orders SET payment_method = 'CASH' WHERE payment_method IS NULL;
UPDATE sales_invoices SET payment_method = 'CASH' WHERE payment_method IS NULL;
