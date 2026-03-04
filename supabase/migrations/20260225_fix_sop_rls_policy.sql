-- Fix SOP RLS Policies to use 'Administrator' role
-- Run this in Supabase SQL Editor

DROP POLICY IF EXISTS "Admins and managers can insert SOPs" ON public.company_sops;
DROP POLICY IF EXISTS "Admins and managers can update SOPs" ON public.company_sops;
DROP POLICY IF EXISTS "Admins and managers can delete SOPs" ON public.company_sops;

-- Recreate policies with 'Administrator'
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
