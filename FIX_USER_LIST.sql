-- SMART CLEANUP: Align User List with Active Employees

-- 1. DELETE profiles that are linked to INACTIVE or DELETED employees
DELETE FROM profiles 
WHERE employee_id IS NOT NULL 
AND employee_id NOT IN (SELECT id FROM employees WHERE status = 'active');

-- 2. DELETE profiles that have NO employee link, EXCEPT for specific Admins
-- (Change 'admin@company.com' to your actual admin email if different)
DELETE FROM profiles 
WHERE employee_id IS NULL 
AND email NOT IN ('admin@company.com', 'superadmin@jayatempo.com');

-- 3. (Optional) Update roles based on current position
UPDATE profiles p
SET role = CASE 
    WHEN e.position ILIKE '%Manager%' THEN 'manager'
    WHEN e.position ILIKE '%Admin%' THEN 'admin' 
    ELSE 'staff' 
END
FROM employees e
WHERE p.employee_id = e.id;
