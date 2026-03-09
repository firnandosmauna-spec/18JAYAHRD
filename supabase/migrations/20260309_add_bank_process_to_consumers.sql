-- Migration: Add bank_process to consumer_profiles
-- Description: Adds a field to track the bank processing status for consumers.

ALTER TABLE public.consumer_profiles 
ADD COLUMN IF NOT EXISTS bank_process CHARACTER VARYING;
