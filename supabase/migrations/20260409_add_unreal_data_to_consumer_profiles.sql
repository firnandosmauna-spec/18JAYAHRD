alter table public.consumer_profiles 
add column if not exists unreal_data jsonb default '{}'::jsonb;
