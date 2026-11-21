/**
 * Explicit column lists for list screens.
 *
 * `jobs.*` includes `description`, `notes` and `ai_meta` — and `ai_meta` stores
 * the verbatim original post (up to 100 KB per job). Selecting `*` on the board
 * or jobs list ships that whole payload to the server renderer, and on the
 * board straight into the client RSC payload. These lists keep list queries
 * proportional to what the screen actually shows.
 */

export const JOB_DASHBOARD_COLUMNS =
  "id, company, title, status, source, deadline, created_at, updated_at";

export const JOB_LIST_COLUMNS =
  "id, company, title, location, status, source, url, deadline, created_at, updated_at";

export const JOB_BOARD_COLUMNS =
  "id, company, title, status, source, deadline, updated_at";

/** Full row — only the detail and edit screens need these. */
export const JOB_DETAIL_COLUMNS =
  "id, user_id, company, title, location, salary, job_type, source, url, deadline, applied_at, interview_date, status, priority, description, notes, screenshot, ai_meta, created_at, updated_at";

export const ACTIVITY_COLUMNS =
  "id, job_id, kind, from_status, to_status, note, happened_at";

export const QUESTION_COLUMNS =
  "id, job_id, user_id, round, question, answer, status, created_at, updated_at";
