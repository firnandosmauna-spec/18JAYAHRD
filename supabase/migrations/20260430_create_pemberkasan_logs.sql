
-- Migration: Create consumer_pemberkasan_logs table
-- Description: Table to track every movement/change in the pemberkasan checklist.

CREATE TABLE IF NOT EXISTS public.consumer_pemberkasan_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pemberkasan_id UUID NOT NULL REFERENCES public.consumer_pemberkasan(id) ON DELETE CASCADE,
    stage_key TEXT NOT NULL,
    status BOOLEAN NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.consumer_pemberkasan_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON public.consumer_pemberkasan_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_pemberkasan_logs_id ON public.consumer_pemberkasan_logs(pemberkasan_id);
