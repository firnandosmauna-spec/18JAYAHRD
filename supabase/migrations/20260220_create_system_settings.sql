-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default payroll settings
-- This ensures the system has values to calculate absent deductions, bpjs, etc.
INSERT INTO system_settings (key, value, description)
VALUES 
('payroll_deduction_absent', '100000', 'Potongan per hari tidak hadir'),
('payroll_tax_rate', '0', 'Tarif pajak payroll'),
('payroll_bpjs_rate', '0.03', 'Tarif BPJS (misal 3%)'),
('payroll_allowance_gasoline', '0', 'Tunjangan bensin'),
('payroll_allowance_meal', '25000', 'Tunjangan makan per hari'),
('payroll_allowance_position', '0', 'Tunjangan jabatan'),
('payroll_allowance_thr', '0', 'Tunjangan THR')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all for development)
-- In production, you might want to restrict this to authenticated admins
DROP POLICY IF EXISTS "Allow all operations on system_settings" ON system_settings;
CREATE POLICY "Allow all operations on system_settings" ON system_settings FOR ALL USING (true);
