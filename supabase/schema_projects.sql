-- ============================================
-- PROJECT MODULE TABLES (CORRECTED V2)
-- ============================================

-- Drop tables if they exist to ensure clean retry
DROP TABLE IF EXISTS project_workers CASCADE;
DROP TABLE IF EXISTS project_materials CASCADE;
DROP TABLE IF EXISTS project_phases CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Create projects table
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    location TEXT,
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'in-progress', 'completed', 'on-hold', 'cancelled')),
    type VARCHAR(50), -- 'new', 'renovation', etc.
    area_sqm DECIMAL(10,2),
    start_date DATE,
    end_date DATE, -- Target completion date
    budget DECIMAL(15,2) DEFAULT 0,
    spent DECIMAL(15,2) DEFAULT 0,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_phases table
CREATE TABLE project_phases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
    start_date DATE,
    end_date DATE,
    weightage DECIMAL(5,2) DEFAULT 0, -- Percentage contribution to total project progress
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_materials table (Link Projects <-> Inventory Products)
CREATE TABLE project_materials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    -- CORRECTION: product_id uses BIGINT
    product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT, 
    quantity_planned DECIMAL(15,2) DEFAULT 0,
    quantity_used DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(50),
    cost_per_unit DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_workers table (Link Projects <-> Employees)
CREATE TABLE project_workers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    -- CORRECTION: employee_id uses BIGINT based on live DB error
    employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(100), -- 'Mandor', 'Tukang', etc. specific to this project
    daily_rate DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    joined_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client ON projects(client_name);
CREATE INDEX idx_project_phases_project ON project_phases(project_id);
CREATE INDEX idx_project_materials_project ON project_materials(project_id);
CREATE INDEX idx_project_materials_product ON project_materials(product_id);
CREATE INDEX idx_project_workers_project ON project_workers(project_id);
CREATE INDEX idx_project_workers_employee ON project_workers(employee_id);

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON project_phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_materials_updated_at BEFORE UPDATE ON project_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_workers_updated_at BEFORE UPDATE ON project_workers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_workers ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all for now, restrict later)
CREATE POLICY "Allow all operations on projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all operations on project_phases" ON project_phases FOR ALL USING (true);
CREATE POLICY "Allow all operations on project_materials" ON project_materials FOR ALL USING (true);
CREATE POLICY "Allow all operations on project_workers" ON project_workers FOR ALL USING (true);
