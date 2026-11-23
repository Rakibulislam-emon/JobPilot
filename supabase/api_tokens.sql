create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table public.api_tokens enable row level security;

drop policy if exists "own API tokens" on public.api_tokens;
create policy "own API tokens" on public.api_tokens
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.api_tokens from anon;
grant select, insert, update, delete on public.api_tokens to authenticated;
grant all on public.api_tokens to service_role;
