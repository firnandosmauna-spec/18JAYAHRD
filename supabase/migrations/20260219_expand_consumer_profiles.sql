-- Expand consumer_profiles table with detailed fields

ALTER TABLE public.consumer_profiles
ADD COLUMN IF NOT EXISTS npwp VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_id_number VARCHAR(50), -- ID Perusahaan
ADD COLUMN IF NOT EXISTS booking_remarks TEXT, -- Ket/Booking
ADD COLUMN IF NOT EXISTS salary DECIMAL(15, 2), -- Gaji

-- Data Pekerjaan
ADD COLUMN IF NOT EXISTS occupation VARCHAR(100), -- Pekerjaan
ADD COLUMN IF NOT EXISTS employer_name VARCHAR(255), -- Nama perusahaan/Usaha
ADD COLUMN IF NOT EXISTS employer_address TEXT, -- Alamat perusahaan/usaha
ADD COLUMN IF NOT EXISTS employer_phone VARCHAR(50), -- HP/WA Perusahaan
ADD COLUMN IF NOT EXISTS employer_remarks TEXT, -- Keterangan Pekerjaan

-- Data Pasangan
ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20), -- Status (Single, Married, Divorced, etc.)
ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(255), -- Nama Pasangan
ADD COLUMN IF NOT EXISTS spouse_phone VARCHAR(50), -- HP/WA Pasangan
ADD COLUMN IF NOT EXISTS spouse_occupation VARCHAR(100), -- Pekerjaan Pasangan
ADD COLUMN IF NOT EXISTS spouse_office_address TEXT, -- Alamat kantor/usaha Pasangan
ADD COLUMN IF NOT EXISTS spouse_remarks TEXT, -- Keterangan Pasangan

-- Data Keluarga (Emergency Contact / Family)
ADD COLUMN IF NOT EXISTS family_name VARCHAR(255), -- Nama Keluarga
ADD COLUMN IF NOT EXISTS family_relationship VARCHAR(50), -- Hubungan
ADD COLUMN IF NOT EXISTS family_phone VARCHAR(50), -- HP/WA Keluarga
ADD COLUMN IF NOT EXISTS family_address TEXT; -- Alamat Keluarga
