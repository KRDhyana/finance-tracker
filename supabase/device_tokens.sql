-- Run once in Supabase SQL editor (Phase 3 — push notifications).
-- Stores FCM/APNs tokens per user device.

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.device_tokens enable row level security;

create policy "Users manage own device tokens"
  on public.device_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);
