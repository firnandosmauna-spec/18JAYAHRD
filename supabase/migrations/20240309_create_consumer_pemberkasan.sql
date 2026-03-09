
-- Migration: Create consumer_pemberkasan table
-- Description: Table to track the document processing status for consumers.

CREATE TABLE IF NOT EXISTS public.consumer_pemberkasan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consumer_id UUID NOT NULL REFERENCES public.consumer_profiles(id) ON DELETE CASCADE,
    booking BOOLEAN DEFAULT FALSE,
    slik_ojk BOOLEAN DEFAULT FALSE,
    proses_berkas BOOLEAN DEFAULT FALSE,
    ots BOOLEAN DEFAULT FALSE,
    penginputan BOOLEAN DEFAULT FALSE,
    analis_data BOOLEAN DEFAULT FALSE,
    lpa_aprasial BOOLEAN DEFAULT FALSE,
    pip BOOLEAN DEFAULT FALSE,
    pk BOOLEAN DEFAULT FALSE,
    akad BOOLEAN DEFAULT FALSE,
    pencairan_akad BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(consumer_id)
);

-- Enable RLS
ALTER TABLE public.consumer_pemberkasan ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON public.consumer_pemberkasan
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_consumer_pemberkasan_updated_at
    BEFORE UPDATE ON public.consumer_pemberkasan
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
