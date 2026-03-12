-- 1. Function to sync email
CREATE OR REPLACE FUNCTION public.sync_employee_email_to_user()
RETURNS TRIGGER AS $$
BEGIN
    -- If email has changed
    IF (OLD.email IS DISTINCT FROM NEW.email AND NEW.email IS NOT NULL) THEN
        -- A. Sync to public.profiles
        UPDATE public.profiles
        SET email = NEW.email,
            updated_at = NOW()
        WHERE employee_id = NEW.id;

        -- B. Sync to auth.users 
        UPDATE auth.users
        SET email = NEW.email,
            updated_at = NOW()
        WHERE id IN (
            SELECT id FROM public.profiles WHERE employee_id = NEW.id
        );

        -- C. Sync to auth.identities
        UPDATE auth.identities
        SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(NEW.email)),
            updated_at = NOW()
        WHERE user_id IN (
            SELECT id FROM public.profiles WHERE employee_id = NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_employee_email_change ON public.employees;
CREATE TRIGGER on_employee_email_change
AFTER UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.sync_employee_email_to_user();

-- 3. ONE-TIME SYNC: Fix existing out-of-sync data
DO $$
DECLARE
    emp RECORD;
BEGIN
    FOR emp IN SELECT id, email FROM public.employees WHERE email IS NOT NULL LOOP
        -- Sync to profiles
        UPDATE public.profiles 
        SET email = emp.email, updated_at = NOW() 
        WHERE employee_id = emp.id AND email IS DISTINCT FROM emp.email;

        -- Sync to auth.users
        UPDATE auth.users 
        SET email = emp.email, updated_at = NOW() 
        WHERE id IN (SELECT id FROM public.profiles WHERE employee_id = emp.id)
        AND email IS DISTINCT FROM emp.email;
    END LOOP;
END $$;
