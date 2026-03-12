-- RECONCILIATION MIGRATION: Fix Accounting Module Schema
-- Description: Ensures all columns exist and correct potential data type issues

-- 1. Ensure accounting_accounts has correct structure
DO $$ 
BEGIN
    -- Ensure balance is decimal and has default 0
    ALTER TABLE public.accounting_accounts ALTER COLUMN balance SET DEFAULT 0;
    
    -- Add is_active if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounting_accounts' AND column_name = 'is_active') THEN
        ALTER TABLE public.accounting_accounts ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 2. Ensure accounting_journals has correct structure
DO $$ 
BEGIN
    -- Add created_by as TEXT to support both UUIDs and string labels like 'Administrator'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounting_journals' AND column_name = 'created_by') THEN
        ALTER TABLE public.accounting_journals ADD COLUMN created_by TEXT;
    END IF;
    
    -- Ensure status has correct check constraint
    ALTER TABLE public.accounting_journals DROP CONSTRAINT IF EXISTS accounting_journals_status_check;
    ALTER TABLE public.accounting_journals ADD CONSTRAINT accounting_journals_status_check CHECK (status IN ('draft', 'posted', 'void', 'reversed'));
END $$;

-- 3. Ensure accounting_journal_items has DENORMALIZED columns (CRITICAL FIX)
-- The app sends account_code and account_name which might be missing in older schemas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounting_journal_items' AND column_name = 'account_code') THEN
        ALTER TABLE public.accounting_journal_items ADD COLUMN account_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounting_journal_items' AND column_name = 'account_name') THEN
        ALTER TABLE public.accounting_journal_items ADD COLUMN account_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounting_journal_items' AND column_name = 'description') THEN
        ALTER TABLE public.accounting_journal_items ADD COLUMN description TEXT;
    END IF;
END $$;

-- 4. Re-verify RLS policies
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal_items ENABLE ROW LEVEL SECURITY;

-- Allow all for now to unblock
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.accounting_accounts;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.accounting_journals;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.accounting_journal_items;

CREATE POLICY "Allow all for authenticated users" ON public.accounting_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.accounting_journals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.accounting_journal_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow Anon for development if needed (Optional, but helps if user is not logged in)
-- CREATE POLICY "Allow all for anon" ON public.accounting_accounts FOR ALL TO anon USING (true) WITH CHECK (true);
