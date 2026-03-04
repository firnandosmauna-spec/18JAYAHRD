-- Consolidated Initial Setup Fix for Profiles and Admin RPCs v3
-- Run this in Supabase SQL Editor to resolve 404, PGRST201, and Registration errors

-- 1. Enable Extensions in a safe schema (Supabase uses 'extensions' schema by default)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- 2. Create/Fix role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    role TEXT NOT NULL,
    module TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create/Fix profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    avatar TEXT,
    modules TEXT[] DEFAULT ARRAY['hrd'],
    employee_id UUID, -- We will add the FK named separately
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ROBUST AMBIGUITY FIX: Clear all duplicate Foreign Keys
DO $$ 
DECLARE
    rk RECORD;
BEGIN
    FOR rk IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'profiles' 
          AND table_schema = 'public' 
          AND column_name = 'employee_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(rk.constraint_name) || ' CASCADE';
    END LOOP;

    ALTER TABLE public.profiles 
    ADD CONSTRAINT fk_profiles_employee 
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;
END $$;

-- 5. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'Administrator' OR role = 'manager')
        )
    );

-- 6. Admin RPC: Create User with conflict handling and EXPLICIT SEARCH PATH
CREATE OR REPLACE FUNCTION public.admin_create_user(
  email text,
  password text,
  user_name text,
  user_role text,
  target_employee_id uuid
)
RETURNS jsonb
SECURITY DEFINER
-- Include extensions schema for pgcrypto functions
SET search_path = public, auth, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id uuid;
  result jsonb;
BEGIN
  -- Verify caller
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'Administrator' OR role = 'manager')
  ) THEN
    -- Allow the VERY FIRST user to be created if no profiles exist
    IF EXISTS (SELECT 1 FROM public.profiles) THEN
        RAISE EXCEPTION 'Access denied. Only Administrators can register users.';
    END IF;
  END IF;

  -- 0. CLEANUP LEGACY/ORPHAN PROFILES
  -- Delete any profile that might have been created with employee_id as PK (from sync)
  -- This prevents duplicate records for the same employee
  DELETE FROM public.profiles WHERE id = target_employee_id OR email = admin_create_user.email;

  -- 1. Create user
  new_user_id := extensions.gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', email,
    extensions.crypt(password, extensions.gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('name', user_name, 'role', user_role, 'employee_id', target_employee_id),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
  ) VALUES (
    extensions.gen_random_uuid(), new_user_id, json_build_object('sub', new_user_id, 'email', email),
    'email', now(), now(), now(), new_user_id::text
  );
  
  -- 2. UPSERT Profile (using the REAL Auth ID)
  INSERT INTO public.profiles (id, email, name, role, employee_id, modules)
  VALUES (
    new_user_id, email, user_name, user_role, target_employee_id, 
    CASE WHEN user_role = 'Administrator' THEN ARRAY['hrd', 'accounting', 'inventory', 'sales', 'purchase', 'customer', 'project', 'marketing']::text[] ELSE ARRAY['hrd']::text[] END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    employee_id = EXCLUDED.employee_id,
    modules = EXCLUDED.modules,
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'user_id', new_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

-- 7. Admin RPC: Reset Password with EXPLICIT SEARCH PATH
CREATE OR REPLACE FUNCTION public.admin_reset_password(
  target_user_id uuid,
  new_password text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth, extensions
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Administrator'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only Administrators can reset passwords.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN FOUND;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to reset password: %', SQLERRM;
END;
$$;
