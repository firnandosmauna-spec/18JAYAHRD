-- Add new columns to notifications table to support broadcast announcements and popups
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_popup BOOLEAN DEFAULT FALSE;

-- Update RLS policies if necessary (assuming they already allow insert/select for relevant roles)
-- If not, ensure Administrators can insert and everyone can select their own (or null user_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' AND policyname = 'Admins can insert notifications'
    ) THEN
        CREATE POLICY "Admins can insert notifications" ON public.notifications
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.role = 'Administrator'
            )
        );
    END IF;
END $$;
