-- Comprehensive Project Module Repair Script
-- Run this in the Supabase SQL Editor to restore missing tables

-- 0. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    location TEXT,
    status VARCHAR(50) DEFAULT 'planning',
    type VARCHAR(100),
    area_sqm DECIMAL(15,2),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2) DEFAULT 0,
    spent DECIMAL(15,2) DEFAULT 0,
    progress DECIMAL(5,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create project_phases table
CREATE TABLE IF NOT EXISTS project_phases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    start_date DATE,
    end_date DATE,
    weightage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create project_workers table
CREATE TABLE IF NOT EXISTS project_workers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(255),
    daily_rate DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    joined_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create project_labor_rates table (Master Gaji)
CREATE TABLE IF NOT EXISTS project_labor_rates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    default_rate DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create project_worker_payments table
CREATE TABLE IF NOT EXISTS project_worker_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES project_workers(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_type VARCHAR(50) DEFAULT 'Harian',
    reference_number VARCHAR(100),
    notes TEXT,
    working_days DECIMAL(15,2),
    daily_rate DECIMAL(15,2),
    late_deduction DECIMAL(15,2),
    activity_detail TEXT,
    progress_percentage DECIMAL(5,2),
    worker_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create project_worker_activities table
CREATE TABLE IF NOT EXISTS project_worker_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES project_workers(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES project_labor_rates(id),
    quantity DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(50),
    rate DECIMAL(15,2) DEFAULT 0,
    activity_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create project_progress_logs table
CREATE TABLE IF NOT EXISTS project_progress_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) NOT NULL,
    description TEXT,
    photos TEXT[],
    report_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Enable RLS and Create basic policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_worker_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_worker_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_progress_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Projects
    DROP POLICY IF EXISTS "Allow all on projects" ON projects;
    CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true);
    
    -- Phases
    DROP POLICY IF EXISTS "Allow all on project_phases" ON project_phases;
    CREATE POLICY "Allow all on project_phases" ON project_phases FOR ALL USING (true);
    
    -- Workers
    DROP POLICY IF EXISTS "Allow all on project_workers" ON project_workers;
    CREATE POLICY "Allow all on project_workers" ON project_workers FOR ALL USING (true);
    
    -- Labor Rates
    DROP POLICY IF EXISTS "Allow all on project_labor_rates" ON project_labor_rates;
    CREATE POLICY "Allow all on project_labor_rates" ON project_labor_rates FOR ALL USING (true);
    
    -- Payments
    DROP POLICY IF EXISTS "Allow all on project_worker_payments" ON project_worker_payments;
    CREATE POLICY "Allow all on project_worker_payments" ON project_worker_payments FOR ALL USING (true);
    
    -- Activities
    DROP POLICY IF EXISTS "Allow all on project_worker_activities" ON project_worker_activities;
    CREATE POLICY "Allow all on project_worker_activities" ON project_worker_activities FOR ALL USING (true);
    
    -- Logs
    DROP POLICY IF EXISTS "Allow all on project_progress_logs" ON project_progress_logs;
    CREATE POLICY "Allow all on project_progress_logs" ON project_progress_logs FOR ALL USING (true);
END $$;

-- 9. Seed some Labor Rates if table is empty
INSERT INTO project_labor_rates (name, unit, default_rate)
SELECT 'Pasang Pondasi Batu Kali', 'm3', 150000 WHERE NOT EXISTS (SELECT 1 FROM project_labor_rates WHERE name = 'Pasang Pondasi Batu Kali');
INSERT INTO project_labor_rates (name, unit, default_rate)
SELECT 'Pasang Bata Merah', 'm2', 35000 WHERE NOT EXISTS (SELECT 1 FROM project_labor_rates WHERE name = 'Pasang Bata Merah');
INSERT INTO project_labor_rates (name, unit, default_rate)
SELECT 'Plester Dinding', 'm2', 25000 WHERE NOT EXISTS (SELECT 1 FROM project_labor_rates WHERE name = 'Plester Dinding');
