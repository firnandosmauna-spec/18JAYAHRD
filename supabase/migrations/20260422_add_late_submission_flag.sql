-- Add is_late_submission column to leave_requests
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS is_late_submission BOOLEAN DEFAULT FALSE;

-- Update RLS policies for leave_requests to be more restrictive
-- Specifically for status updates

-- First, drop the existing wide-open policy if it exists (check name from schema.sql original)
-- Based on schema.sql: CREATE POLICY "Allow all operations on leave_requests" ON leave_requests FOR ALL USING (true);
DROP POLICY IF EXISTS "Allow all operations on leave_requests" ON leave_requests;

-- Create more granular policies
CREATE POLICY "Users can view their own leave requests" ON leave_requests
    FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE employee_id = leave_requests.employee_id));

CREATE POLICY "Admins and Managers can view all leave requests" ON leave_requests
    FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Administrator', 'manager')));

CREATE POLICY "Users can insert their own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE employee_id = leave_requests.employee_id));

CREATE POLICY "Only admins can update leave request status" ON leave_requests
    FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'Administrator'))
    WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'Administrator'));

CREATE POLICY "Users can delete their own pending leave requests" ON leave_requests
    FOR DELETE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE employee_id = leave_requests.employee_id) 
        AND status = 'pending'
    );
