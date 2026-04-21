-- 1. Pastikan tabel project_worker_payments ada (dengan semua kolom yang dibutuhkan)
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
    late_deduction DECIMAL(15,2) DEFAULT 0,
    loan_deduction DECIMAL(15,2) DEFAULT 0, -- Kolom baru
    activity_detail TEXT,
    progress_percentage DECIMAL(5,2),
    worker_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Jika tabel sudah ada tapi kolom loan_deduction belum ada, tambahkan secara manual
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_worker_payments' AND column_name='loan_deduction') THEN
        ALTER TABLE project_worker_payments ADD COLUMN loan_deduction DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;

-- 3. Pastikan RLS aktif agar bisa diakses aplikasi
ALTER TABLE project_worker_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on project_worker_payments" ON project_worker_payments;
CREATE POLICY "Allow all on project_worker_payments" ON project_worker_payments FOR ALL USING (true);
