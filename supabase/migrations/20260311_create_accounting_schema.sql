-- Migration: Create Accounting Module Schema
-- Description: Initializes accounting tables and seeds basic Chart of Accounts (CoA)

-- 1. Create accounting_accounts table
CREATE TABLE IF NOT EXISTS public.accounting_accounts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    description TEXT,
    balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    parent_id UUID REFERENCES public.accounting_accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create accounting_journals table
CREATE TABLE IF NOT EXISTS public.accounting_journals (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference TEXT,
    status TEXT DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
    created_by TEXT, -- Allow string like 'Administrator' or UUID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create accounting_journal_items table
CREATE TABLE IF NOT EXISTS public.accounting_journal_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    journal_id UUID REFERENCES public.accounting_journals(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounting_accounts(id),
    account_code TEXT, -- Denormalized for history
    account_name TEXT, -- Denormalized for history
    debit DECIMAL(15,2) NOT NULL DEFAULT 0,
    credit DECIMAL(15,2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS and Create Policies
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal_items ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounting_accounts') THEN
        CREATE POLICY "Allow all for authenticated users" ON public.accounting_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounting_journals') THEN
        CREATE POLICY "Allow all for authenticated users" ON public.accounting_journals FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounting_journal_items') THEN
        CREATE POLICY "Allow all for authenticated users" ON public.accounting_journal_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Create triggers for updated_at
CREATE TRIGGER update_accounting_accounts_updated_at 
BEFORE UPDATE ON public.accounting_accounts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Initial Seed Data: Basic Chart of Accounts
-- Use a CTE or simple inserts if IDs are generated
INSERT INTO public.accounting_accounts (code, name, type, description)
VALUES 
    ('1-1000', 'Kas Utama', 'asset', 'Saldo kas tunai utama'),
    ('1-1100', 'Bank BCA', 'asset', 'Saldo rekening bank BCA'),
    ('2-1000', 'Hutang Dagang', 'liability', 'Kewajiban kepada supplier'),
    ('3-1000', 'Modal Disetor', 'equity', 'Modal awal pemilik'),
    ('4-1000', 'Pendapatan Penjualan', 'revenue', 'Hasil penjualan barang/jasa'),
    ('6-1000', 'Beban Operasional', 'expense', 'Biaya operasional perusahaan'),
    ('6-1100', 'Beban Gaji', 'expense', 'Biaya gaji karyawan')
ON CONFLICT (code) DO NOTHING;
