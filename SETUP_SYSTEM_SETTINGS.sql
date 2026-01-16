-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default values for Attendance Settings if not exists
INSERT INTO system_settings (key, value, description)
VALUES 
    ('attendance_late_penalty', '1000'::jsonb, 'Potongan gaji per menit keterlambatan (IDR)'),
    ('attendance_sp1_threshold', '30'::jsonb, 'Batas akumulasi keterlambatan per minggu sebelum SP1 (menit)')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for read access (all authenticated users)
CREATE POLICY "Enable read access for authenticated users" 
ON system_settings FOR SELECT 
TO authenticated 
USING (true);

-- Create policy for update access (admins only)
CREATE POLICY "Enable update access for admins" 
ON system_settings FOR UPDATE 
TO authenticated 
USING (
    exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
);

-- Create policy for insert access (admins only)
CREATE POLICY "Enable insert access for admins" 
ON system_settings FOR INSERT 
TO authenticated 
WITH CHECK (
    exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
);
