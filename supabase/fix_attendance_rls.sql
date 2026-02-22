-- FIX FOR ATTENDANCE DELETE & PROFILE LINKING
-- Run this in your Supabase SQL Editor

-- 1. ATTENDANCE TABLE FIX
DROP POLICY IF EXISTS "attendance_full_access" ON attendance;
DROP POLICY IF EXISTS "Allow all operations on attendance" ON attendance;
DROP POLICY IF EXISTS "Enable delete for all" ON attendance;

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_full_access" 
ON attendance FOR ALL TO public 
USING (true) WITH CHECK (true);

GRANT ALL ON attendance TO authenticated, anon, service_role;

-- 2. PROFILES TABLE FIX (For dian@dian.com linking)
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_admin_all" 
ON profiles FOR ALL TO public 
USING (true) WITH CHECK (true);

GRANT ALL ON profiles TO authenticated, anon, service_role;

-- 3. FORCE LINK DIAN (Using ILIKE for flexibility)
UPDATE public.profiles
SET employee_id = (
  SELECT id FROM public.employees 
  WHERE email ILIKE 'dian@dian.com' OR name ILIKE '%Dian%' 
  LIMIT 1
)
WHERE email ILIKE 'dian@dian.com' OR email ILIKE 'dian@dian.con';

-- 4. VERIFY
SELECT email, name, employee_id FROM public.profiles WHERE email ILIKE 'dian%';
