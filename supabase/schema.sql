-- ============================================================
--  JobDesk — Supabase schema
--  Run this ONCE in:  Supabase Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. Jobs
-- ------------------------------------------------------------
create table if not exists public.jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,

  company      text not null default '',
  title        text not null default '',
  location     text not null default '',
  salary       text not null default '',
  job_type     text not null default '',          -- full-time | internship | part-time | contract
  source       text not null default '',          -- bdjobs | linkedin | facebook | email | other
  url          text not null default '',
  deadline     date,
  applied_at   date,

  status       text not null default 'saved'
               check (status in ('saved','applied','oa','interview','offer','rejected','ghosted','withdrawn')),
  priority     int  not null default 3 check (priority between 1 and 5),

  description  text not null default '',
  notes        text not null default '',

  screenshot   text,                              -- storage path inside the "shots" bucket
  ai_meta      jsonb,                             -- engine + confidence from the parser

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists jobs_user_status_idx  on public.jobs (user_id, status);
create index if not exists jobs_user_created_idx on public.jobs (user_id, created_at desc);
create index if not exists jobs_user_deadline_idx on public.jobs (user_id, deadline);

-- ------------------------------------------------------------
-- 2. Activity timeline
-- ------------------------------------------------------------
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null default 'note'
              check (kind in ('created','status','note','interview','followup')),
  from_status text,
  to_status   text,
  note        text not null default '',
  happened_at timestamptz not null default now()
);

create index if not exists activities_job_idx on public.activities (job_id, happened_at desc);
create index if not exists activities_user_idx on public.activities (user_id, happened_at desc);

-- ------------------------------------------------------------
-- 3. Recruiter / contact cards
-- ------------------------------------------------------------
create table if not exists public.contacts (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.jobs (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default '',
  role       text not null default '',
  email      text not null default '',
  phone      text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists contacts_job_idx on public.contacts (job_id);

-- ------------------------------------------------------------
-- 4. Attachments (extra screenshots / JD files)
-- ------------------------------------------------------------
create table if not exists public.attachments (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.jobs (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  path       text not null,
  kind       text not null default 'screenshot',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. Encrypted AI provider credentials (service-role only)
-- ------------------------------------------------------------
create table if not exists public.ai_provider_keys (
  user_id        uuid not null references auth.users (id) on delete cascade,
  provider       text not null check (provider in ('gemini', 'openrouter', 'groq')),
  encrypted_key  text not null,
  updated_at     timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.ai_provider_keys enable row level security;
revoke all on public.ai_provider_keys from anon, authenticated;
grant all on public.ai_provider_keys to service_role;

-- ------------------------------------------------------------
-- 6. Keep updated_at fresh
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists jobs_touch_updated_at on public.jobs;
create trigger jobs_touch_updated_at
  before update on public.jobs
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 7. Row Level Security — every row belongs to exactly one auth user
-- ------------------------------------------------------------
alter table public.jobs        enable row level security;
alter table public.activities  enable row level security;
alter table public.contacts    enable row level security;
alter table public.attachments enable row level security;
alter table public.ai_provider_keys enable row level security;

drop policy if exists "own jobs"        on public.jobs;
drop policy if exists "own activities"  on public.activities;
drop policy if exists "own contacts"    on public.contacts;
drop policy if exists "own attachments" on public.attachments;

create policy "own jobs" on public.jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own activities" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own contacts" on public.contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own attachments" on public.attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 8. Screenshot storage bucket (private; served via signed URLs)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('shots', 'shots', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 9. Convenience view for the dashboard
-- ------------------------------------------------------------
create or replace view public.job_overview
with (security_invoker = true) as
select
  j.user_id,
  count(*)                                                        as total,
  count(*) filter (where j.status = 'saved')                      as saved,
  count(*) filter (where j.status = 'applied')                    as applied,
  count(*) filter (where j.status = 'oa')                         as oa,
  count(*) filter (where j.status = 'interview')                  as interview,
  count(*) filter (where j.status = 'offer')                      as offer,
  count(*) filter (where j.status in ('rejected','ghosted'))       as closed
from public.jobs j
group by j.user_id;

-- ============================================================
--  DONE.
--  Next: Authentication → Users → "Add user" → set your email
--  and password, then turn OFF "Allow new users to sign up".
-- ============================================================
