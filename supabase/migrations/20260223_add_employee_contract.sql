-- Add contract_file_url to employees
ALTER TABLE "public"."employees" ADD COLUMN IF NOT EXISTS "contract_file_url" TEXT;

-- Create the employee_contracts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee_contracts', 'employee_contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for the bucket (dropping existing policies first to be idempotent if re-run)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'employee_contracts' );

CREATE POLICY "Authenticated users can upload"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'employee_contracts' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can update own files"
    ON storage.objects FOR UPDATE
    WITH CHECK ( bucket_id = 'employee_contracts' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can delete own files"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'employee_contracts' AND auth.role() = 'authenticated' );
