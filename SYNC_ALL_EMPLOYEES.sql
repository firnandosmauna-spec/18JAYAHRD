-- 1. Insert Profiles for ALL Active Employees who don't have one yet.
-- This ensures that every employee (Admin + 3 others) appears in the User Management list.
-- We default them to 'staff' role, and create a fake email if they don't have one.

INSERT INTO profiles (id, email, name, role, created_at, updated_at, employee_id)
SELECT 
    e.id, -- Use Employee ID as User ID for simplicity in this migration (or generate new UUID)
    COALESCE(e.email, lower(replace(e.name, ' ', '.')) || '@jayatempo.com'), 
    e.name, 
    CASE WHEN e.position ILIKE '%Admin%' OR e.position ILIKE '%Manager%' THEN 'manager' ELSE 'staff' END,
    NOW(), 
    NOW(),
    e.id
FROM employees e
WHERE e.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.email = COALESCE(e.email, lower(replace(e.name, ' ', '.')) || '@jayatempo.com')
);

-- Note: This creates PROFILES, but they won't have Login Passwords (auth.users) unless they sign up.
-- But they WILL appear in the "Manajemen Pengguna" list now, which is what we want for "Data".
