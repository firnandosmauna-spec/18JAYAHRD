-- Create retention_funds table
CREATE TABLE IF NOT EXISTS retention_funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consumer_id UUID NOT NULL REFERENCES consumer_profiles(id) ON DELETE CASCADE,
    housing_project TEXT,
    amount NUMERIC(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed')),
    claim_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate retention records for the same consumer
ALTER TABLE retention_funds ADD CONSTRAINT unique_consumer_retention UNIQUE (consumer_id);

-- Enable RLS
ALTER TABLE retention_funds ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON retention_funds FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON retention_funds FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON retention_funds FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON retention_funds FOR DELETE USING (true);

-- Function to handle automatic retention record creation
CREATE OR REPLACE FUNCTION handle_akad_finished_retention()
RETURNS TRIGGER AS $$
BEGIN
    -- If akad status is changed to true
    IF (NEW.akad = true AND (OLD.akad IS NULL OR OLD.akad = false)) THEN
        -- Insert into retention_funds if not exists
        INSERT INTO retention_funds (consumer_id, housing_project)
        SELECT 
            NEW.consumer_id, 
            cp.housing_project
        FROM consumer_profiles cp
        WHERE cp.id = NEW.consumer_id
        ON CONFLICT (consumer_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for consumer_pemberkasan
DROP TRIGGER IF EXISTS trg_akad_finished_retention ON consumer_pemberkasan;
CREATE TRIGGER trg_akad_finished_retention
AFTER UPDATE ON consumer_pemberkasan
FOR EACH ROW EXECUTE FUNCTION handle_akad_finished_retention();
