-- 🚨 UPDATED COMPREHENSIVE FIX & DIAGNOSTIC SCRIPT 🚨
-- Run this in the Supabase SQL Editor

-- 1. Fix: Open up INSERT to everyone (public) for testing
-- We do this OUTSIDE a transaction block first to ensure it applies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.consumer_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert consumer profiles" ON public.consumer_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert consumer profiles" ON public.consumer_profiles;
DROP POLICY IF EXISTS "DEBUG_PUBLIC_INSERT" ON public.consumer_profiles;
DROP POLICY IF EXISTS "FIX_ANYONE_CAN_INSERT" ON public.consumer_profiles;

CREATE POLICY "FIX_ANYONE_CAN_INSERT" ON public.consumer_profiles
    FOR INSERT TO public WITH CHECK (true);

ALTER TABLE public.consumer_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Diagnostic: List all active policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    with_check 
FROM pg_policies 
WHERE tablename = 'consumer_profiles';

-- 3. Diagnostic: List all triggers using standard information_schema
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement, 
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'consumer_profiles';

-- 4. Diagnostic: Check current session identity
SELECT 
    auth.uid() as current_user_uuid,
    auth.role() as current_auth_role;

-- 5. Diagnostic: Check if user exists in profiles and what their role is
-- (Only if you are currently logged in)
SELECT id, email, name, role 
FROM public.profiles 
WHERE id = auth.uid();
