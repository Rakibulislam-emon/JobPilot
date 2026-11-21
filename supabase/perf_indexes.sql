-- ============================================================
--  JobDesk — performance indexes
--  Run this ONCE in: Supabase Dashboard → SQL Editor → New query
--  (Safe to re-run — every statement is IF NOT EXISTS.)
--
--  These match the queries the app actually issues:
--    • board / "recently updated" sort  → (user_id, updated_at desc)
--    • source filter on the jobs list   → (user_id, source)
--    • duplicate-URL guard on save      → partial (user_id, url)
--    • prep page question bank          → (user_id, created_at desc)
-- ============================================================

-- Board and the "Recently updated" sort read one user's jobs newest-first.
create index if not exists jobs_user_updated_idx
  on public.jobs (user_id, updated_at desc);

-- Jobs list filter by source (LinkedIn, BDJobs, …) per user.
create index if not exists jobs_user_source_idx
  on public.jobs (user_id, source);

-- Duplicate guard on save: only rows that actually have a URL matter, so the
-- partial index stays small even when most jobs are screenshot-only.
create index if not exists jobs_user_url_idx
  on public.jobs (user_id, url)
  where url is not null and url <> '';

-- Prep page loads every question for a user, newest first.
create index if not exists interview_questions_user_created_idx
  on public.interview_questions (user_id, created_at desc);
