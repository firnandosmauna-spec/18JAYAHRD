-- Migration to add Master Gaji (Labor Rates) and Rincian Kegiatan (Worker Activities)
-- Create project_labor_rates table (Master Gaji/Upah)
CREATE TABLE IF NOT EXISTS project_labor_rates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    default_rate DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_worker_activities table (Rincian Kegiatan)
CREATE TABLE IF NOT EXISTS project_worker_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES project_workers(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES project_labor_rates(id) ON DELETE RESTRICT,
    quantity DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(50),
    rate DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * rate) STORED,
    activity_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_labor_rates_name ON project_labor_rates(name);
CREATE INDEX IF NOT EXISTS idx_worker_activities_project ON project_worker_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_worker_activities_worker ON project_worker_activities(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_activities_activity ON project_worker_activities(activity_id);
CREATE INDEX IF NOT EXISTS idx_worker_activities_date ON project_worker_activities(activity_date);

-- Enable RLS
ALTER TABLE project_labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_worker_activities ENABLE ROW LEVEL SECURITY;

-- Policies (Allow all for now, as per existing module pattern)
CREATE POLICY "Allow all operations on project_labor_rates" ON project_labor_rates FOR ALL USING (true);
CREATE POLICY "Allow all operations on project_worker_activities" ON project_worker_activities FOR ALL USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_project_labor_rates_updated_at 
BEFORE UPDATE ON project_labor_rates 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_worker_activities_updated_at 
BEFORE UPDATE ON project_worker_activities 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed some default rates
INSERT INTO project_labor_rates (name, unit, default_rate) VALUES
('Pasang Pondasi Batu Kali', 'm3', 150000),
('Pasang Bata Merah', 'm2', 35000),
('Plester Dinding', 'm2', 25000),
('Pasang Keramik Lantai', 'm2', 45000),
('Cat Dinding', 'm2', 15000);
