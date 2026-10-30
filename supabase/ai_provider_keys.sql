-- Run in Supabase SQL Editor to enable encrypted AI provider key storage from Settings.
create table if not exists public.ai_provider_keys (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('gemini', 'openrouter', 'groq')),
  encrypted_key text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.ai_provider_keys enable row level security;
revoke all on public.ai_provider_keys from anon, authenticated;
grant all on public.ai_provider_keys to service_role;
