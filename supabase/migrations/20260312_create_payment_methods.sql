-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_methods') THEN
        CREATE POLICY "Enable all for authenticated users" ON payment_methods FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Insert default methods
INSERT INTO payment_methods (name, description) VALUES 
('Tunai / Cash', 'Pembayaran tunai langsung'),
('Transfer Bank', 'Pembayaran melalui transfer antar rekening'),
('Hutang / Tempo', 'Pembayaran ditangguhkan (hutang)')
ON CONFLICT DO NOTHING;
