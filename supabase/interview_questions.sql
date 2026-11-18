-- ============================================================
--  JobDesk — Interview question bank
--  Run this ONCE in: Supabase Dashboard → SQL Editor → New query
--  (Safe to re-run.)
-- ============================================================

create table if not exists public.interview_questions (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.jobs (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,

  round      text not null default '',            -- "HR screen", "Technical · Round 2"…
  question   text not null,                       -- what they asked
  answer     text not null default '',            -- how you answered / what to learn
  status     text not null default 'missed'       -- how it went
             check (status in ('missed','shaky','solid')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interview_questions_job_idx
  on public.interview_questions (job_id, created_at desc);
create index if not exists interview_questions_user_status_idx
  on public.interview_questions (user_id, status);

-- Keep updated_at fresh (same helper used by jobs)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists interview_questions_touch_updated_at on public.interview_questions;
create trigger interview_questions_touch_updated_at
  before update on public.interview_questions
  for each row execute function public.touch_updated_at();

-- Row Level Security — every row belongs to exactly one auth user
alter table public.interview_questions enable row level security;

drop policy if exists "own interview questions" on public.interview_questions;
create policy "own interview questions" on public.interview_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
