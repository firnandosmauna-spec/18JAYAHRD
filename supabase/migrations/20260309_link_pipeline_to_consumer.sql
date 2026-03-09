-- Migration: Link Marketing Pipelines to Consumer Profiles and Associate Sales Staff
-- Description: Adds consumer_id to marketing_pipelines and sales_person_id to consumer_profiles.

-- 1. Update consumer_profiles table
ALTER TABLE public.consumer_profiles 
ADD COLUMN IF NOT EXISTS sales_person_id UUID REFERENCES auth.users(id);

-- 2. Update marketing_pipelines table
ALTER TABLE public.marketing_pipelines 
ADD COLUMN IF NOT EXISTS consumer_id UUID REFERENCES public.consumer_profiles(id);

-- 3. Update RLS for consumer_profiles
-- Allow users to see consumers assigned to them or created by them
DROP POLICY IF EXISTS "Sales can view their assigned consumers" ON public.consumer_profiles;
CREATE POLICY "Sales can view their assigned consumers" ON public.consumer_profiles
    FOR SELECT USING (
        auth.uid() = sales_person_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'Administrator' OR role = 'manager')
        )
    );

-- Allow users to update their assigned consumers
DROP POLICY IF EXISTS "Sales can update their assigned consumers" ON public.consumer_profiles;
CREATE POLICY "Sales can update their assigned consumers" ON public.consumer_profiles
    FOR UPDATE USING (
        auth.uid() = sales_person_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'Administrator' OR role = 'manager')
        )
    );

-- 4. Update RLS for marketing_pipelines
-- Update existing policy or add new one for assigned deals
DROP POLICY IF EXISTS "Users can see their own pipelines" ON public.marketing_pipelines;
CREATE POLICY "Users can see their own pipelines" ON public.marketing_pipelines
    FOR SELECT USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'Administrator' OR role = 'manager')
        )
    );
