-- Description: Adds table to track individual payments made to suppliers against their invoices and project location support.

-- 1. Add project_location to existing tables
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS project_location TEXT;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS project_location TEXT;

-- 2. Create purchase_payments table
CREATE TABLE IF NOT EXISTS purchase_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Function to update purchase_invoice status and paid_amount
CREATE OR REPLACE FUNCTION update_purchase_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.invoice_id IS NOT NULL) THEN
        UPDATE purchase_invoices
        SET paid_amount = paid_amount + NEW.amount,
            payment_status = CASE 
                WHEN (paid_amount + NEW.amount) >= total_amount THEN 'paid'
                WHEN (paid_amount + NEW.amount) > 0 THEN 'partial'
                ELSE 'unpaid'
            END,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for purchase_payments
DROP TRIGGER IF EXISTS trg_update_purchase_invoice_on_payment ON purchase_payments;
CREATE TRIGGER trg_update_purchase_invoice_on_payment
AFTER INSERT ON purchase_payments
FOR EACH ROW EXECUTE FUNCTION update_purchase_invoice_on_payment();

-- 4. Enable RLS
ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Allow read access for all users on purchase_payments" ON purchase_payments FOR SELECT USING (true);
CREATE POLICY "Allow all access for all users on purchase_payments" ON purchase_payments FOR ALL USING (true);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_payments_supplier_id ON purchase_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_invoice_id ON purchase_payments(invoice_id);
