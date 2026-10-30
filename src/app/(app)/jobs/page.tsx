import { JobsFilterBar } from "@/components/JobsFilterBar";
import { PageHeader } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { SOURCES, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { daysUntil, formatDate, relativeTime } from "@/lib/format";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/** Columns the free-text search looks at. */
const SEARCH_COLUMNS = [
  "company",
  "title",
  "location",
  "job_type",
  "salary",
  "notes",
  "description",
  "url",
] as const;

type FilterChain = {
  eq(column: string, value: string): FilterChain;
  or(filters: string): FilterChain;
};

/**
 * Splits the search box into safe words. PostgREST syntax characters
 * (`,`, `(`, `)`, `%`, `*`) can never reach the query string this way.
 */
function searchTokens(raw: string): string[] {
  return raw
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 5);
}

/**
 * Owner scope + free-text search + dropdown filters.
 * Words are AND-ed (all must match), columns are OR-ed (any column may match),
 * so "Data Entry (Night Shift)" still finds the job.
 */
function applyFilters<T>(
  query: T,
  userId: string,
  tokens: string[],
  status: string,
  source: string
): T {
  let next = query as unknown as FilterChain;
  next = next.eq("user_id", userId);
  for (const token of tokens) {
    next = next.or(
      SEARCH_COLUMNS.map((column) => `${column}.ilike.%${token}%`).join(",")
    );
  }
  if (status) next = next.eq("status", status);
  if (source) next = next.eq("source", source);
  return next as unknown as T;
}

/** `?q=a&q=b` arrives as an array — keep the last value so the page never crashes. */
function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[value.length - 1] ?? "";
  return value ?? "";
}

function DeadlineCell({ job }: { job: Job }) {
  if (!job.deadline) return <span className="text-muted/50">—</span>;
  const d = daysUntil(job.deadline);
  const done = ["offer", "rejected", "ghosted", "withdrawn"].includes(job.status);

  let tone = "text-muted";
  if (!done && d !== null) {
    if (d < 0) tone = "text-danger";
    else if (d <= 3) tone = "text-warn";
    else tone = "text-fg";
  }

  return (
    <span className={`mono text-[11.5px] ${tone}`}>
      {formatDate(job.deadline)}
      {!done && d !== null && d >= 0 && d <= 7 && (
        <span className="ml-1 text-[10px] opacity-80">
          ({d === 0 ? "today" : `${d}d`})
        </span>
      )}
    </span>
  );
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    source?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const q = param(sp.q).trim().slice(0, 100);
  const tokens = searchTokens(q);
  const statusRaw = param(sp.status);
  const sourceRaw = param(sp.source);
  const sortRaw = param(sp.sort);
  const pageRaw = param(sp.page);

  const status = STATUS_ORDER.includes(statusRaw as (typeof STATUS_ORDER)[number])
    ? statusRaw
    : "";
  const source = SOURCES.some((item) => item.value === sourceRaw) ? sourceRaw : "";
  const sort = ["new", "updated", "deadline", "company"].includes(sortRaw)
    ? sortRaw
    : "new";
  const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
  const filters = { q, status, source, sort };

  // Count first so a stale/out-of-range `page` can be clamped instead of
  // making PostgREST return 416 ("Requested range not satisfiable").
  const { count, error: countError } = await applyFilters(
    supabase.from("jobs").select("id", { count: "exact", head: true }),
    user.id,
    tokens,
    status,
    source
  );
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (!countError && page > pageCount) redirect(jobsPageHref(filters, pageCount));

  let query = applyFilters(
    supabase.from("jobs").select("*"),
    user.id,
    tokens,
    status,
    source
  );

  if (sort === "deadline") {
    query = query.order("deadline", { ascending: true, nullsFirst: false });
  } else if (sort === "company") {
    query = query.order("company", { ascending: true });
  } else if (sort === "updated") {
    query = query.order("updated_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1
  );
  const jobs = (data ?? []) as Job[];

  const hasFilters = Boolean(tokens.length || status || source || sort !== "new");

  return (
    <div className="animate-in">
      <PageHeader
        title="Jobs"
        subtitle={`${total} result${total === 1 ? "" : "s"}${
          hasFilters ? " (filtered)" : ""
        }`}
        action={{ href: "/jobs/new", label: "Add job" }}
      />

      <JobsFilterBar q={filters.q} status={filters.status} source={filters.source} sort={filters.sort} />

      {error ? (
        <div role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          Could not load jobs. Please refresh and try again.
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-line-2 px-6 py-14 text-center">
          <p className="text-sm font-medium">No jobs match</p>
          <p className="mt-1 text-xs text-muted">
            {hasFilters
              ? "Try clearing the filters."
              : "Add your first job to start tracking."}
          </p>
          <Link href="/jobs/new" className="btn btn-primary mt-4">
            Add a job
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* header row — desktop only */}
          <div className="hidden grid-cols-[1fr_120px_100px_110px_90px] gap-3 border-b border-line px-4 py-2.5 text-[11.5px] font-medium text-muted-2 md:grid">
            <span>Role / company</span>
            <span>Status</span>
            <span>Source</span>
            <span>Deadline</span>
            <span className="text-right">Updated</span>
          </div>

          <ul className="divide-y divide-line">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="group grid grid-cols-1 gap-2 px-4 py-3 transition-colors hover:bg-surface-2/50 md:grid-cols-[1fr_120px_100px_110px_90px] md:items-center md:gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-fg">
                        {job.title || "(untitled role)"}
                      </span>
                      {job.priority <= 2 && (
                        <span className="pill border-line-2 bg-transparent px-1.5 py-0 text-[9.5px] text-fg-2">
                          {job.priority === 1 ? "dream" : "high"}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11.5px] text-muted">
                      {job.company || "Unknown company"}
                      {job.location ? ` · ${job.location}` : ""}
                    </div>
                  </div>

                  <div className="md:block">
                    <StatusPill status={job.status} />
                  </div>

                  <div className="hidden text-[11.5px] capitalize text-muted md:block">
                    {job.source || "—"}
                  </div>

                  <div className="hidden md:block">
                    <DeadlineCell job={job} />
                  </div>

                  <div className="hidden text-right text-[11px] text-muted md:block">
                    {relativeTime(job.updated_at)}
                  </div>

                  {/* mobile meta row */}
                  <div className="flex items-center gap-3 text-[11px] text-muted md:hidden">
                    <DeadlineCell job={job} />
                    <span className="capitalize">{job.source || "—"}</span>
                    <span className="ml-auto">{relativeTime(job.updated_at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!error && total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <nav aria-label="Jobs pages" className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={jobsPageHref(filters, page - 1)} className="btn btn-ghost">Previous</Link>
            ) : (
              <span className="btn btn-ghost pointer-events-none opacity-40">Previous</span>
            )}
            <span className="mono">{page} / {pageCount}</span>
            {page < pageCount ? (
              <Link href={jobsPageHref(filters, page + 1)} className="btn btn-ghost">Next</Link>
            ) : (
              <span className="btn btn-ghost pointer-events-none opacity-40">Next</span>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}

function jobsPageHref(
  filters: { q?: string; status?: string; source?: string; sort?: string },
  page: number
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (filters.sort && filters.sort !== "new") params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/jobs?${params.toString()}`;
}
