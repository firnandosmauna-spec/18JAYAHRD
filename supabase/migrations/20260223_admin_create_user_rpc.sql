-- Migration to safely register users via Supabase RPC

-- Function to securely create a user without exposing credentials to client-side auth state
CREATE OR REPLACE FUNCTION admin_create_user(
  email text,
  password text,
  user_name text,
  user_role text,
  target_employee_id uuid
)
RETURNS jsonb
SECURITY DEFINER -- Execute as DB Admin
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id uuid;
  result jsonb;
BEGIN
  -- Verify the caller is an admin or manager
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied. You must be an admin or manager to create users.';
  END IF;

  -- Verify employee exists if provided
  IF target_employee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.employees WHERE id = target_employee_id
  ) THEN
    RAISE EXCEPTION 'The linked employee_id does not exist.';
  END IF;

  -- Create user within Supabase Auth (auth.users)
  -- Uses the undocumented but well-known auth.users insertion for trigger-agnostic setups
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
