-- Migration: Add SP3K to consumer_pemberkasan
-- Description: Adds SP3K tracking columns to the consumer pemberkasan table.

ALTER TABLE public.consumer_pemberkasan
ADD COLUMN IF NOT EXISTS sp3k BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sp3k_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sp3k_file_url TEXT;
