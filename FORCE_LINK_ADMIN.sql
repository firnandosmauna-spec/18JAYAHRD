-- FORCE LINK ADMIN TO EMPLOYEE (Corrected Columns)
-- 1. Check if 'Admin' employee exists. If not, create one.
-- Columns: name, email, position, department, status, salary, join_date, bank, bank_account
INSERT INTO employees (name, email, position, department, status, salary, join_date, bank, bank_account)
SELECT 'Super Admin', 'admin@company.com', 'Director', 'Management', 'active', 50000000, NOW(), 'BCA', '1234567890'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = 'admin@company.com' OR name = 'Super Admin');

-- 2. Link the 'admin@company.com' Profile to this Employee
UPDATE profiles
SET employee_id = (SELECT id FROM employees WHERE email = 'admin@company.com' OR name = 'Super Admin' LIMIT 1)
WHERE email = 'admin@company.com';

-- 3. Also link any 'Manager' profile if missing
UPDATE profiles
SET employee_id = (SELECT id FROM employees WHERE position ILIKE '%Manager%' LIMIT 1)
WHERE role = 'manager' AND employee_id IS NULL;
