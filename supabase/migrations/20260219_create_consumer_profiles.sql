-- Create consumer profiles table
create table if not exists public.consumer_profiles (
    id uuid not null default gen_random_uuid(),
    code character varying not null,
    name character varying not null,
    id_card_number character varying,
    address text,
    phone character varying,
    email character varying,
    sales_person character varying,
    created_at timestamp with time zone default now(),
    constraint consumer_profiles_pkey primary key (id),
    constraint consumer_profiles_code_key unique (code)
);

alter table public.consumer_profiles enable row level security;

create policy "Enable read access for all users" on "public"."consumer_profiles"
as permissive for select
to public
using (true);

create policy "Enable insert for authenticated users only" on "public"."consumer_profiles"
as permissive for insert
to authenticated
with check (true);

create policy "Enable update for authenticated users only" on "public"."consumer_profiles"
as permissive for update
to authenticated
using (true);

create policy "Enable delete for authenticated users only" on "public"."consumer_profiles"
as permissive for delete
to authenticated
using (true);
