-- Create consumer transactions table for POS Booking
CREATE TABLE IF NOT EXISTS public.consumer_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consumer_id UUID NOT NULL REFERENCES public.consumer_profiles(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type TEXT NOT NULL DEFAULT 'booking_fee', -- 'booking_fee', 'dp', 'installment', etc.
    payment_method TEXT NOT NULL, -- 'cash', 'transfer', 'edc'
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_number TEXT UNIQUE,
    notes TEXT,
    attachment_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_consumer_transactions_consumer_id ON public.consumer_transactions(consumer_id);
CREATE INDEX IF NOT EXISTS idx_consumer_transactions_type ON public.consumer_transactions(transaction_type);

-- Enable RLS
ALTER TABLE public.consumer_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all for authenticated users" ON public.consumer_transactions
    FOR ALL USING (auth.role() = 'authenticated');

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    seq_val TEXT;
    year_val TEXT;
BEGIN
    year_val := to_char(NOW(), 'YYYY');
    -- A simple way to get a unique sequence-like string
    seq_val := to_char(nextval('receipt_seq'), 'FM0000');
    RETURN 'RCP-' || year_val || '-' || seq_val;
EXCEPTION WHEN undefined_table THEN
    -- Fallback if sequence doesn't exist yet
    RETURN 'RCP-' || year_val || '-' || to_char(floor(random() * 10000), 'FM0000');
END;
$$ LANGUAGE plpgsql;

-- Create sequence for receipts
DO $$
BEGIN
    CREATE SEQUENCE receipt_seq START 1;
EXCEPTION
    WHEN duplicate_table THEN NULL;
END $$;
