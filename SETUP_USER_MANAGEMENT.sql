-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. VIEW POLICY: Everyone can view basic profile info (needed for lists, foreign keys)
-- Drop existing to avoid conflicts if needed, or use create if not exists style
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- 2. UPDATE POLICY: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 3. ADMIN UPDATE POLICY: Admins can update ANY profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" 
ON profiles FOR UPDATE 
TO authenticated 
USING (
    exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
);

-- Note: Inserting into profiles is usually handled by triggers on auth.users, 
-- but if manual insert is needed:
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (
    exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
);
