-- Consolidated SOP Setup Migration
-- This script creates the company_sops table and sets up the correct RLS policies.
-- Run this in the Supabase SQL Editor.

-- 1. Create company_sops table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.company_sops (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.company_sops ENABLE ROW LEVEL SECURITY;

-- 3. Clear existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can read active SOPs" ON public.company_sops;
DROP POLICY IF EXISTS "Admins and managers can insert SOPs" ON public.company_sops;
DROP POLICY IF EXISTS "Admins and managers can update SOPs" ON public.company_sops;
DROP POLICY IF EXISTS "Admins and managers can delete SOPs" ON public.company_sops;

-- 4. Create correct policies
-- Only authenticated users can read active SOPs
CREATE POLICY "Authenticated users can read active SOPs"
    ON public.company_sops FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only Administrators and managers can insert SOPs
CREATE POLICY "Admins and managers can insert SOPs"
    ON public.company_sops FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'Administrator' OR profiles.role = 'manager')
        )
    );

-- Only Administrators and managers can update SOPs
CREATE POLICY "Admins and managers can update SOPs"
    ON public.company_sops FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'Administrator' OR profiles.role = 'manager')
        )
    );

-- Only Administrators and managers can delete SOPs
CREATE POLICY "Admins and managers can delete SOPs"
    ON public.company_sops FOR DELETE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'Administrator' OR profiles.role = 'manager')
        )
    );

-- 5. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.company_sops_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Recreate updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.company_sops;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.company_sops
  FOR EACH ROW EXECUTE PROCEDURE public.company_sops_set_updated_at();
