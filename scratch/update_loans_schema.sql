-- 1. Tambahkan kolom histori ke tabel employee_loans
ALTER TABLE public.employee_loans 
ADD COLUMN IF NOT EXISTS requested_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 2. Migrasi data lama (set requested_amount = amount) jika belum ada
UPDATE public.employee_loans SET requested_amount = amount WHERE requested_amount = 0;

-- 3. Buat tabel riwayat cicilan (loan payments)
CREATE TABLE IF NOT EXISTS public.employee_loan_payments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    loan_id UUID REFERENCES public.employee_loans(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_method TEXT DEFAULT 'cash', -- 'cash', 'payroll', 'transfer'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Aktifkan RLS untuk tabel baru
ALTER TABLE public.employee_loan_payments ENABLE ROW LEVEL SECURITY;

-- 5. Buat policy RLS (Sesuaikan dengan kebijakan keamanan Anda)
-- Admin bisa semua aksi
CREATE POLICY "Admins can do everything on loan payments" 
ON public.employee_loan_payments FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'Administrator'));

-- Staff bisa melihat cicilan miliknya sendiri
CREATE POLICY "Staff can view their own loan payments"
ON public.employee_loan_payments FOR SELECT
USING (loan_id IN (SELECT id FROM public.employee_loans WHERE employee_id IN (SELECT employee_id FROM public.profiles WHERE id = auth.uid())));
