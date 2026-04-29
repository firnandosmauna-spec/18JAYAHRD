-- Migration: Add status to consumer_profiles
-- Description: Adds a status field to track if a consumer is active or cancelled (batal).

ALTER TABLE public.consumer_profiles
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'aktif';

-- Also add index for performance
CREATE INDEX IF NOT EXISTS idx_consumer_profiles_status ON public.consumer_profiles(status);
