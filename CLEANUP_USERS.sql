-- Clean up old test users from profiles
-- WARNING: This will remove access for these users.
-- Keeps 'admin@company.com' or similar if needed.

DELETE FROM profiles 
WHERE email NOT IN ('admin@company.com', 'hrd@company.com') -- Keep essential accounts
AND (employee_id IS NULL OR employee_id NOT IN (SELECT id FROM employees));

-- Ideally we should also clean auth.users but strictly speaking profiles usually drives the UI list.
