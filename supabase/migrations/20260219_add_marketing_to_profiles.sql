-- Add 'marketing' module to all users with role 'manager' or 'staff'
-- ensuring they have access to the new module

UPDATE public.profiles
SET modules = 
  CASE 
    -- If modules is null, create array with existing modules + marketing (if default logic was applied)
    -- But since we can't know the default logic in SQL easily, better to just append if not exists
    WHEN modules IS NULL THEN ARRAY['hrd', 'marketing']::text[] -- Fallback safe
    
    -- If 'marketing' is NOT in the array, append it
    WHEN NOT ('marketing' = ANY(modules)) THEN array_append(modules, 'marketing')
    
    -- Otherwise keep as is
    ELSE modules
  END
WHERE role IN ('manager', 'staff');

-- specific fix for any user who might be using the app right now
-- Recalculate modules for everyone to be safe? No, let's just append.

-- Also ensure admin has it (usually admin has * logic in frontend but good to be explicit)
UPDATE public.profiles
SET modules = array_append(modules, 'marketing')
WHERE role = 'admin' AND NOT ('marketing' = ANY(modules));
