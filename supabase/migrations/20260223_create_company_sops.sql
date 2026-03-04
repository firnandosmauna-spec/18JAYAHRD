-- Create company_sops table
create table if not exists public.company_sops (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    content text not null,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.company_sops enable row level security;

-- Only authenticated users can read active SOPs
create policy "Authenticated users can read active SOPs"
    on public.company_sops for select
    using (auth.role() = 'authenticated');

-- Only admins and managers can insert/update/delete SOPs
create policy "Admins and managers can insert SOPs"
    on public.company_sops for insert
    with check (
        auth.role() = 'authenticated' and
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and (profiles.role = 'admin' or profiles.role = 'manager')
        )
    );

create policy "Admins and managers can update SOPs"
    on public.company_sops for update
    using (
        auth.role() = 'authenticated' and
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and (profiles.role = 'admin' or profiles.role = 'manager')
        )
    );

create policy "Admins and managers can delete SOPs"
    on public.company_sops for delete
    using (
        auth.role() = 'authenticated' and
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and (profiles.role = 'admin' or profiles.role = 'manager')
        )
    );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.company_sops_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger
create trigger handle_updated_at before update on public.company_sops
  for each row execute procedure public.company_sops_set_updated_at();
