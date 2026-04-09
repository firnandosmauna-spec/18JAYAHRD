-- Add file URL columns to consumer_pemberkasan for document attachments
ALTER TABLE consumer_pemberkasan
ADD COLUMN IF NOT EXISTS booking_file_url TEXT,
ADD COLUMN IF NOT EXISTS slik_ojk_file_url TEXT,
ADD COLUMN IF NOT EXISTS proses_berkas_file_url TEXT,
ADD COLUMN IF NOT EXISTS ots_file_url TEXT,
ADD COLUMN IF NOT EXISTS penginputan_file_url TEXT,
ADD COLUMN IF NOT EXISTS analis_data_file_url TEXT,
ADD COLUMN IF NOT EXISTS lpa_aprasial_file_url TEXT,
ADD COLUMN IF NOT EXISTS pip_file_url TEXT,
ADD COLUMN IF NOT EXISTS pk_file_url TEXT,
ADD COLUMN IF NOT EXISTS akad_file_url TEXT,
ADD COLUMN IF NOT EXISTS pencairan_akad_file_url TEXT;
