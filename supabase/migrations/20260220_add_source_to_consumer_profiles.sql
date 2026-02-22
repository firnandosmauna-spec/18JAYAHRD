-- Add source column to consumer_profiles
ALTER TABLE public.consumer_profiles
ADD COLUMN IF NOT EXISTS source VARCHAR(100); -- Sumber Konsumen (Medsos, Iklan, dll)
