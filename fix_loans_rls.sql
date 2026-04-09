-- Drop the old overly simplistic policy if it exists
DROP POLICY IF EXISTS "Allow all operations on employee_loans" ON employee_loans;

-- Create a robust policy that explicitly allows all operations
-- This ensures INSERTs (WITH CHECK) are also allowed
CREATE POLICY "Enable all access for all users" ON employee_loans
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Also ensure the employees table join is not blocked (already checked, but good for completeness)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on employees" ON employees;
CREATE POLICY "Allow all operations on employees" ON employees
    FOR ALL
    USING (true)
    WITH CHECK (true);
