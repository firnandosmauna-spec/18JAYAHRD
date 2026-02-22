-- Create Reward Types table
CREATE TABLE IF NOT EXISTS public.reward_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    default_points INTEGER DEFAULT 100,
    description TEXT,
    icon_name TEXT DEFAULT 'Award',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.reward_types ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
DROP POLICY IF EXISTS "reward_types_full_access" ON public.reward_types;
CREATE POLICY "reward_types_full_access" 
ON public.reward_types FOR ALL TO public 
USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.reward_types TO authenticated, anon, service_role;

-- Seed initial data
INSERT INTO public.reward_types (name, code, default_points, description, icon_name)
VALUES 
('Karyawan Terbaik Bulan Ini', 'employee_of_month', 500, 'Penghargaan untuk performa terbaik bulanan', 'Crown'),
('Penghargaan Inovasi', 'innovation_award', 300, 'Diberikan atas ide atau proyek inovatif', 'Star'),
('Pemimpin Tim Terbaik', 'best_team_leader', 400, 'Penghargaan kepemimpinan tim', 'Trophy'),
('Kehadiran Sempurna', 'perfect_attendance', 200, 'Kehadiran 100% dalam satu bulan', 'Medal'),
('Juara Layanan Pelanggan', 'customer_champion', 250, 'Rating pelanggan tertinggi', 'Award'),
('Pencapaian Target', 'closing', 350, 'Berhasil mencapai target penjualan/proyek', 'Target'),
('Penghargaan Khusus', 'custom', 100, 'Penghargaan untuk kategori lainnya', 'Gift')
ON CONFLICT (code) DO NOTHING;

-- Add reward_type_id to rewards table if needed (optional, keeping 'type' as text for compatibility)
-- ALTER TABLE public.rewards ADD COLUMN reward_type_id UUID REFERENCES public.reward_types(id);
