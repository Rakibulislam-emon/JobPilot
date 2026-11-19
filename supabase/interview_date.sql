-- Add an optional confirmed interview date to existing JobDesk installations.
alter table public.jobs
  add column if not exists interview_date date;
