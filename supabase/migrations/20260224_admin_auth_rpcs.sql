-- Migration to safely register and manage users via Supabase RPC
-- Includes both admin_create_user and admin_reset_password

-- 1. Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Function to securely create a user
CREATE OR REPLACE FUNCTION public.admin_create_user(
  email text,
  password text,
  user_name text,
  user_role text,
  target_employee_id uuid
)
RETURNS jsonb
SECURITY DEFINER -- Execute as DB Admin
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id uuid;
  result jsonb;
BEGIN
  -- Verify the caller is an admin or manager
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'Administrator' OR role = 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied. You must be an Administrator or Manager to create users.';
  END IF;

  -- Create user within Supabase Auth (auth.users)
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    email,
    crypt(password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    json_build_object(
      'name', user_name,
      'role', user_role,
      'employee_id', target_employee_id
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Add to auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    provider_id
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    json_build_object('sub', new_user_id, 'email', email),
    'email',
    now(),
    now(),
    now(),
    new_user_id::text
  );
  
  result := jsonb_build_object(
    'success', true,
    'user_id', new_user_id
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 3. Function to securely reset a user's password
CREATE OR REPLACE FUNCTION public.admin_reset_password(
  target_user_id uuid,
  new_password text
)
RETURNS boolean
SECURITY DEFINER -- Execute as DB Admin
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Administrator'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only Administrators can reset passwords.';
  END IF;

  -- Update password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN FOUND;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to reset password: %', SQLERRM;
END;
$$;
