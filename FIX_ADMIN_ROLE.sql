-- FORCE ENABLE FULL ACCESS FOR ADMIN
-- Ensure the email 'admin@company.com' has role = 'admin'
-- (Sometimes it might have stuck as 'staff' default)

UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@company.com';

-- Verify the result
SELECT email, role, employee_id FROM profiles WHERE email = 'admin@company.com';
