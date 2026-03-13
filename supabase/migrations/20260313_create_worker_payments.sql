-- Migration to create project_worker_payments table
CREATE TABLE IF NOT EXISTS project_worker_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES project_workers(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_type VARCHAR(50) CHECK (payment_type IN ('Harian', 'Borongan', 'Bonus')),
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_payments_project ON project_worker_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_worker ON project_worker_payments(worker_id);

-- Enable RLS
ALTER TABLE project_worker_payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all operations on project_worker_payments" ON project_worker_payments FOR ALL USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_project_worker_payments_updated_at 
BEFORE UPDATE ON project_worker_payments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
