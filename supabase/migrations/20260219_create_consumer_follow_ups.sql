-- Create consumer_follow_ups table
create table if not exists public.consumer_follow_ups (
    id uuid not null default gen_random_uuid(),
    consumer_id uuid not null references public.consumer_profiles(id) on delete cascade,
    follow_up_date timestamp with time zone default now(),
    notes text,
    status varchar(50) default 'pending', -- pending, approved, rejected
    photo_url text, -- Storage URL for uploaded photo
    created_at timestamp with time zone default now(),
    created_by uuid references auth.users(id), -- Optional: track who created it
    constraint consumer_follow_ups_pkey primary key (id)
);

-- Enable RLS
alter table public.consumer_follow_ups enable row level security;

-- Policies
create policy "Enable read access for all users" on "public"."consumer_follow_ups"
as permissive for select
to public
using (true);

create policy "Enable insert for authenticated users only" on "public"."consumer_follow_ups"
as permissive for insert
to authenticated
with check (true);

create policy "Enable update for authenticated users only" on "public"."consumer_follow_ups"
as permissive for update
to authenticated
using (true);

-- Storage Bucket Policy (Start simple: public access for now or auth only)
-- Note: Bucket creation is usually done via dashboard or specific storage API calls, but we can try to insert into storage.buckets if permissions allow.
-- For now, we assume the bucket 'follow_up_evidence' exists or we will use 'avatars' as a fallback if needed, but better to create a new one.

insert into storage.buckets (id, name, public)
values ('follow_up_evidence', 'follow_up_evidence', true)
on conflict (id) do nothing;

create policy "Enable upload for authenticated users" on storage.objects
for insert to authenticated
with check (bucket_id = 'follow_up_evidence');

create policy "Enable read access for all users" on storage.objects
for select to public
using (bucket_id = 'follow_up_evidence');
