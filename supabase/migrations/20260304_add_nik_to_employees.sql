-- Migration to add NIK (Nomor Induk Karyawan) to employees table
-- Run this in Supabase SQL Editor

-- 1. Add NIK column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nik VARCHAR(50);

-- 2. Add unique constraint (optional - uncomment if desired)
-- ALTER TABLE employees ADD CONSTRAINT employees_nik_unique UNIQUE (nik);

-- 3. Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_employees_nik ON employees(nik);

-- 4. Set default NIK for existing employees (e.g. using a prefix + sequence or part of their ID)
-- This is a placeholder, user can manually update them later
UPDATE employees 
SET nik = UPPER(SUBSTRING(id::text FROM 1 FOR 8))
WHERE nik IS NULL;
