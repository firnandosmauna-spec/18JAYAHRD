-- FIX PERMISSIONS (RLS) - VERSION 2 (WITH DELETE)

-- 1. Enable RLS
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to be clean
DROP POLICY IF EXISTS "Enable read access for all users" ON payroll;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON payroll;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON payroll;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON payroll;

-- 3. Create ALL Permissions (Select, Insert, Update, DELETE)
-- Allow Authenticated Users to View
CREATE POLICY "Enable read access for all users" ON payroll
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow Authenticated Users to Insert
CREATE POLICY "Enable insert for authenticated users" ON payroll
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow Authenticated Users to Update
CREATE POLICY "Enable update for authenticated users" ON payroll
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow Authenticated Users to DELETE (This was missing)
CREATE POLICY "Enable delete for authenticated users" ON payroll
FOR DELETE USING (auth.role() = 'authenticated');
