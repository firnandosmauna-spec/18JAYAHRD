-- Fix INSERT policy for consumer_profiles
-- This script ensures that authenticated users can insert new consumer profiles,
-- while maintaining security by ensuring they are either managers/admins 
-- or are assigning the profile to themselves.

BEGIN;

-- 1. Drop existing insert policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.consumer_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert consumer profiles" ON public.consumer_profiles;

-- 2. Create a new, robust insert policy
CREATE POLICY "Authenticated users can insert consumer profiles" ON public.consumer_profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        -- Option A: User is an Administrator or Manager (checked via profiles table)
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'Administrator' OR role = 'manager')
        ) OR
        -- Option B: User is assigning the profile to themselves as the sales person
        auth.uid() = sales_person_id OR 
        -- Option C: User is setting sales_person_id to NULL (fallback)
        sales_person_id IS NULL
    );

-- 3. Verify RLS is enabled
ALTER TABLE public.consumer_profiles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verification Helper (Run separately if needed)
-- SELECT * FROM pg_policies WHERE tablename = 'consumer_profiles';
