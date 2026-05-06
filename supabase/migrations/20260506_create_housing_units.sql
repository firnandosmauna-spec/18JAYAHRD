-- Create housing_units table
CREATE TABLE IF NOT EXISTS housing_units (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    block_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'available', -- available, booked, sold, blocked
    construction_progress DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    consumer_id UUID REFERENCES consumer_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, block_number)
);

-- Enable RLS
ALTER TABLE housing_units ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow all on housing_units" ON housing_units;
    CREATE POLICY "Allow all on housing_units" ON housing_units FOR ALL USING (true);
END $$;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE housing_units;
