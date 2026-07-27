-- Migration for Multiple Screenshots Support
-- Creates a normalized screenshots table linked to applications

-- Create screenshots table
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

-- Create index for faster lookups
create index if not exists application_screenshots_application_id_idx
  on public.application_screenshots(application_id);

create index if not exists application_screenshots_user_id_idx
  on public.application_screenshots(user_id);

-- Enable RLS
alter table public.application_screenshots enable row level security;

-- RLS Policies
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

-- Trigger for updated_at
drop trigger if exists application_screenshots_set_updated_at on public.application_screenshots;
create trigger application_screenshots_set_updated_at
before update on public.application_screenshots
for each row execute function public.set_updated_at();

-- Storage bucket for screenshots (already exists as application-documents, reuse it)
-- The existing bucket policy already handles user-scoped access by folder structure
-- We'll use folder structure: {user_id}/{application_id}/screenshots/{timestamp}-{filename}

-- Migrate existing google_form_screenshot_path data to new screenshots table
-- This is a one-time migration for existing data
insert into public.application_screenshots (application_id, user_id, storage_path, file_name, file_size, mime_type, display_order)
select 
  a.id as application_id,
  a.user_id,
  a.google_form_screenshot_path as storage_path,
  split_part(a.google_form_screenshot_path, '/', -1) as file_name,
  0 as file_size, -- unknown for existing
  'image/png' as mime_type, -- default
  0 as display_order
from public.applications a
where a.google_form_screenshot_path is not null
  and not exists (
    select 1 from public.application_screenshots s 
    where s.application_id = a.id 
    and s.storage_path = a.google_form_screenshot_path
  );