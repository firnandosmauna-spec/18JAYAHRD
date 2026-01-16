-- Check Admin Profile Link status
SELECT id, email, name, role, employee_id 
FROM profiles 
WHERE email = 'admin@company.com' OR role = 'admin';

-- Check if there is an 'Admin' employee
SELECT id, name, position, status 
FROM employees 
WHERE name ILIKE '%Admin%' OR position ILIKE '%Admin%';
