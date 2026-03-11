-- Create supplier_deposits table
CREATE TABLE IF NOT EXISTS supplier_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'usage', 'refund')),
    description TEXT,
    reference_id UUID, -- For linking to purchase invoices or other documents
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add deposit_balance to suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS deposit_balance NUMERIC(15, 2) DEFAULT 0;

-- Function to update supplier deposit balance
CREATE OR REPLACE FUNCTION update_supplier_deposit_balance()
RETURNS TRIGGER AS $$
DECLARE
    delta NUMERIC(15, 2) := 0;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'deposit') THEN
            delta := NEW.amount;
        ELSE
            delta := -NEW.amount;
        END IF;
        UPDATE suppliers SET deposit_balance = deposit_balance + delta WHERE id = NEW.supplier_id;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Reverse old amount
        IF (OLD.type = 'deposit') THEN
            delta := -OLD.amount;
        ELSE
            delta := OLD.amount;
        END IF;
        
        -- Add new amount
        IF (NEW.type = 'deposit') THEN
            delta := delta + NEW.amount;
        ELSE
            delta := delta - NEW.amount;
        END IF;
        
        UPDATE suppliers SET deposit_balance = deposit_balance + delta WHERE id = NEW.supplier_id;
        
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.type = 'deposit') THEN
            delta := -OLD.amount;
        ELSE
            delta := OLD.amount;
        END IF;
        UPDATE suppliers SET deposit_balance = deposit_balance + delta WHERE id = OLD.supplier_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain supplier deposit balance
DROP TRIGGER IF EXISTS trg_update_supplier_deposit_balance ON supplier_deposits;
CREATE TRIGGER trg_update_supplier_deposit_balance
AFTER INSERT OR UPDATE OR DELETE ON supplier_deposits
FOR EACH ROW EXECUTE FUNCTION update_supplier_deposit_balance();

-- Enable RLS
ALTER TABLE supplier_deposits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON supplier_deposits FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON supplier_deposits FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON supplier_deposits FOR DELETE USING (true);
