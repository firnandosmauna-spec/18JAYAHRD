-- AUTO LINK EMPLOYEE ON REGISTRATION
-- This script creates a trigger to automatically link a new User Profile to an existing Employee record
-- if their email addresses match.

-- 1. Create the Function
CREATE OR REPLACE FUNCTION public.match_employee_email()
RETURNS TRIGGER AS $$
DECLARE
  matching_employee_id UUID;
BEGIN
  -- Check if there is an employee with the same email as the new profile
  -- We assume profile email is stored in auth.users, but often copied to profiles or we can query auth.users
  -- However, easier if we check the email passed during insert or update.
  
  -- If profiles table has 'email' column:
  -- SELECT id INTO matching_employee_id FROM public.employees WHERE email = NEW.email;
  
  -- IF profiles table does NOT have email column (common), we might need to look it up from auth.users
  -- OR we can try to find an employee whose email matches the auth.uid's email.
  -- But usually standard starter kits put email in profiles for convenience.
  
  -- Let's try the most robust way: Lookup from auth.users using the ID
  SELECT id INTO matching_employee_id 
  FROM public.employees 
  WHERE email = (
    SELECT email FROM auth.users WHERE id = NEW.id
  );

  -- If a match is found, update the profile
  IF matching_employee_id IS NOT NULL THEN
    UPDATE public.profiles
    SET employee_id = matching_employee_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS on_profile_created_link_employee ON public.profiles;

CREATE TRIGGER on_profile_created_link_employee
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.match_employee_email();

-- 3. Run it once for existing users (Backfill)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM public.profiles WHERE employee_id IS NULL
  LOOP
    UPDATE public.profiles
    SET employee_id = (
      SELECT id FROM public.employees 
      WHERE email = (SELECT email FROM auth.users WHERE id = r.id)
    )
    WHERE id = r.id;
  END LOOP;
END;
$$;
