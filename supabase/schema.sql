create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  job_title text,
  package_offered text,
  applied_on date not null,
  deadline date,
  google_form_link text,
  offer_type text not null check (
    offer_type in (
      'internship',
      'internship_job',
      'job',
      'contract',
      'freelance',
      'other'
    )
  ),
  status text not null default 'applied' check (
    status in (
      'applied',
      'review',
      'interview',
      'offer',
      'rejected',
      'withdrawn',
      'expired'
    )
  ),
  job_description text not null,
  google_form_screenshot_path text,
  resume_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.applications
  add column if not exists package_offered text,
  add column if not exists deadline date,
  add column if not exists google_form_link text;

alter table public.applications
  drop constraint if exists applications_offer_type_check;

alter table public.applications
  add constraint applications_offer_type_check check (
    offer_type in (
      'internship',
      'internship_job',
      'job',
      'contract',
      'freelance',
      'other'
    )
  );

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check check (
    status in (
      'applied',
      'review',
      'interview',
      'offer',
      'rejected',
      'withdrawn',
      'expired'
    )
  );

alter table public.applications
  drop constraint if exists applications_google_form_link_check;

alter table public.applications
  add constraint applications_google_form_link_check check (
    google_form_link is null
    or google_form_link ~* '^https?://'
  );

create index if not exists applications_user_applied_on_idx
  on public.applications(user_id, applied_on desc);

create index if not exists applications_user_deadline_idx
  on public.applications(user_id, deadline);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.applications enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
on public.profiles for delete
using (auth.uid() = id);

drop policy if exists "Users can read own applications" on public.applications;
create policy "Users can read own applications"
on public.applications for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own applications" on public.applications;
create policy "Users can create own applications"
on public.applications for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own applications" on public.applications;
create policy "Users can update own applications"
on public.applications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own applications" on public.applications;
create policy "Users can delete own applications"
on public.applications for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own application files" on storage.objects;
create policy "Users can read own application files"
on storage.objects for select
using (
  bucket_id = 'application-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload own application files" on storage.objects;
create policy "Users can upload own application files"
on storage.objects for insert
with check (
  bucket_id = 'application-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own application files" on storage.objects;
create policy "Users can update own application files"
on storage.objects for update
using (
  bucket_id = 'application-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'application-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own application files" on storage.objects;
create policy "Users can delete own application files"
on storage.objects for delete
using (
  bucket_id = 'application-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Screenshots table for multiple screenshots per application
create table if not exists public.application_screenshots (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size int not null,
  mime_type text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists application_screenshots_application_id_idx
  on public.application_screenshots(application_id);

create index if not exists application_screenshots_user_id_idx
  on public.application_screenshots(user_id);

alter table public.application_screenshots enable row level security;

drop policy if exists "Users can read own screenshots" on public.application_screenshots;
create policy "Users can read own screenshots"
on public.application_screenshots for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own screenshots" on public.application_screenshots;
create policy "Users can create own screenshots"
on public.application_screenshots for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own screenshots" on public.application_screenshots;
create policy "Users can update own screenshots"
on public.application_screenshots for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own screenshots" on public.application_screenshots;
create policy "Users can delete own screenshots"
on public.application_screenshots for delete
using (auth.uid() = user_id);

drop trigger if exists application_screenshots_set_updated_at on public.application_screenshots;
create trigger application_screenshots_set_updated_at
before update on public.application_screenshots
for each row execute function public.set_updated_at();

-- Migrate existing google_form_screenshot_path data to screenshots table
insert into public.application_screenshots (application_id, user_id, storage_path, file_name, file_size, mime_type, display_order)
select 
  a.id as application_id,
  a.user_id,
  a.google_form_screenshot_path as storage_path,
  split_part(a.google_form_screenshot_path, '/', -1) as file_name,
  0 as file_size,
  'image/png' as mime_type,
  0 as display_order
from public.applications a
where a.google_form_screenshot_path is not null
  and not exists (
    select 1 from public.application_screenshots s 
    where s.application_id = a.id 
    and s.storage_path = a.google_form_screenshot_path
  );

-- User integrations for persisting spreadsheet sync connections
create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google_sheets', 'excel_online')),
  provider_account_email text,
  spreadsheet_id text not null,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

create index if not exists user_integrations_user_id_idx
  on public.user_integrations(user_id);

alter table public.user_integrations enable row level security;

drop policy if exists "Users can read own integrations" on public.user_integrations;
create policy "Users can read own integrations"
on public.user_integrations for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own integrations" on public.user_integrations;
create policy "Users can create own integrations"
on public.user_integrations for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own integrations" on public.user_integrations;
create policy "Users can update own integrations"
on public.user_integrations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own integrations" on public.user_integrations;
create policy "Users can delete own integrations"
on public.user_integrations for delete
using (auth.uid() = user_id);

drop trigger if exists user_integrations_set_updated_at on public.user_integrations;
create trigger user_integrations_set_updated_at
before update on public.user_integrations
for each row execute function public.set_updated_at();
