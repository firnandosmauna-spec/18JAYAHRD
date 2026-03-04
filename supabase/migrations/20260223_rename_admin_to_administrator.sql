-- Rename 'admin' role to 'Administrator' in profiles table
UPDATE profiles 
SET role = 'Administrator' 
WHERE role = 'admin';

-- Rename 'admin' role to 'Administrator' in role_permissions table
UPDATE role_permissions
SET role = 'Administrator'
WHERE role = 'admin';

-- Update any other tables that might store the role as a string if necessary
-- (Check your schema for other occurrences)

-- Update RLS Policies that reference 'admin'
-- Note: Replace 'profiles' with the actual table name if different

-- Example for marketing_pipelines (from grep check)
DO $$
BEGIN
    -- This is a template, actual policies might need granular updates
    -- depending on how they are defined in your Supabase project.
    -- You can run these in the SQL Editor.
END $$;

-- If you have specific policies like:
-- CREATE POLICY ... USING (role = 'admin')
-- You should recreate them with:
-- CREATE POLICY ... USING (role = 'Administrator')
