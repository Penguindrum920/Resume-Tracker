-- Migration: user_integrations table for persisting spreadsheet sync connections
-- Stores Google Sheets / Excel Online connection metadata per user

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
