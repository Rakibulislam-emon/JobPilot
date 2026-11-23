import { AddJobTrigger } from "@/components/AddJobModal";
import { Icon } from "@/components/Icon";
import { JobsFilterBar } from "@/components/JobsFilterBar";
import {
  BulkJobActions,
  JobCheckbox,
  JobsSelectionProvider,
  SelectAllCheckbox,
} from "@/components/JobsSelection";
import { StatusPill } from "@/components/StatusPill";
import { Button, buttonVariants } from "@/components/ui/button";
import { SOURCES, STATUS_ORDER } from "@/lib/constants";
import { daysUntil, formatDate, relativeTime } from "@/lib/format";
import { createClient, requireUser } from "@/lib/supabase/server";
import { JOB_LIST_COLUMNS } from "@/lib/queries";
import type { JobSummary } from "@/lib/types";
import { cn } from "cn";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const DHAKA_DAY_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const DHAKA_DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  weekday: "long",
  month: "short",
  day: "numeric",
  year: "numeric",
});

type JobDayGroup = {
  key: string;
  label: string;
  jobs: JobSummary[];
};

function dhakaDayKey(date: Date): string {
  const parts = DHAKA_DAY_PARTS.formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function groupJobsByDay(jobs: JobSummary[]): JobDayGroup[] {
  const today = dhakaDayKey(new Date());
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);
  const grouped = new Map<string, JobSummary[]>();

  for (const job of jobs) {
    const key = dhakaDayKey(new Date(job.created_at));
    const dayJobs = grouped.get(key) ?? [];
    dayJobs.push(job);
    grouped.set(key, dayJobs);
  }

  return Array.from(grouped, ([key, dayJobs]) => ({
    key,
    label:
      key === today
        ? "Today"
        : key === yesterday
          ? "Yesterday"
          : DHAKA_DAY_LABEL.format(new Date(`${key}T00:00:00Z`)),
    jobs: dayJobs,
  })).sort((a, b) => b.key.localeCompare(a.key));
}

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
  neq(column: string, value: string): FilterChain;
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
  else next = next.neq("status", "skipped");
  if (source) next = next.eq("source", source);
  return next as unknown as T;
}

/** `?q=a&q=b` arrives as an array — keep the last value so the page never crashes. */
function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[value.length - 1] ?? "";
  return value ?? "";
}

function DeadlineCell({ job }: { job: JobSummary }) {
  if (!job.deadline) return <span className="text-muted-2">—</span>;
  const d = daysUntil(job.deadline);

  let tone = "text-muted";
  if (d !== null) {
    if (d < 0 || d <= 2) tone = "text-danger";
    else if (d <= 5) tone = "text-warn";
    else tone = "text-fg";
  }

  return (
    <span className={`mono text-[11.5px] ${tone}`}>
      {formatDate(job.deadline)}
      {d !== null && (
        <span className="ml-1 text-[10px] opacity-80">
          ({d < 0 ? "Expired" : `${d}d`})
        </span>
      )}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  if (priority < 1 || priority > 3) return null;
  const tone =
    priority === 1
      ? "border-success/25 bg-success-soft text-success"
      : priority === 2
        ? "border-info/25 bg-info-soft text-info"
        : "border-line-2 bg-surface-2 text-muted";
  return (
    <span className={`mono inline-flex h-4 items-center rounded border px-1 text-[9px] ${tone}`}>
      P{priority}
    </span>
  );
}

function companyMark(value: string): string {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
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
  const sort = ["new", "updated", "deadline", "priority", "company"].includes(sortRaw)
    ? sortRaw
    : "new";
  const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
  const filters = { q, status, source, sort };

  // Count and page run together; a stale/out-of-range `page` is redirected
  // below instead of making PostgREST return 416.
  const countQuery = applyFilters(
    supabase.from("jobs").select("id", { count: "exact", head: true }),
    user.id,
    tokens,
    status,
    source
  );

  let query = applyFilters(
    supabase.from("jobs").select(JOB_LIST_COLUMNS),
    user.id,
    tokens,
    status,
    source
  );

  if (sort === "deadline") {
    query = query.order("deadline", { ascending: true, nullsFirst: false });
  } else if (sort === "priority") {
    query = query
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });
  } else if (sort === "company") {
    query = query.order("company", { ascending: true });
  } else if (sort === "updated") {
    query = query.order("updated_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const [countResult, pageResult] = await Promise.all([
    countQuery,
    query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);

  const total = countResult.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (!countResult.error && page > pageCount) {
    redirect(jobsPageHref(filters, pageCount));
  }

  const { data, error } = pageResult;
  const jobs = (data ?? []) as JobSummary[];
  const jobDays = groupJobsByDay(jobs);

  const hasFilters = Boolean(tokens.length || status || source || sort !== "new");

  return (
    <div className="animate-in">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display text-[26px] text-fg">Jobs</h1>
          <p className="mt-1 text-[12px] text-muted">
            {total} tracked{hasFilters ? " · filtered" : ""}
          </p>
        </div>
        <AddJobTrigger className={buttonVariants({ variant: "default", size: "sm" })}>
          <Icon name="plus" size={14} />
          Add job
        </AddJobTrigger>
      </header>

      <JobsFilterBar q={filters.q} status={filters.status} source={filters.source} sort={filters.sort} />

      {error ? (
        <div role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-[12.5px] text-danger">
          Could not load jobs. Please refresh and try again.
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center border-y border-line px-6 py-14 text-center">
          <p className="text-[13px] font-medium text-fg">No jobs match</p>
          <p className="mt-1 text-[12px] text-muted">
            {hasFilters ? "Try clearing the filters." : "Add your first job to start tracking."}
          </p>
          <AddJobTrigger className={cn(buttonVariants({ variant: "default", size: "sm" }), "mt-4")}>
            Add a job
          </AddJobTrigger>
        </div>
      ) : (
        <JobsSelectionProvider ids={jobs.map((job) => job.id)}>
          <BulkJobActions />

          <div className="mb-3 flex items-center justify-between border-b border-line px-1 pb-2.5">
            <div className="flex items-center gap-2.5">
              <SelectAllCheckbox />
              <span className="text-[11.5px] font-medium text-fg">Added timeline</span>
              <span className="text-[11px] text-muted-2">{total} results</span>
            </div>
            <span className="mono text-[10px] text-muted-2">{page}/{pageCount}</span>
          </div>

          <div className="space-y-6">
            {jobDays.map((group) => (
              <section key={group.key} className="relative ml-1 border-l border-line pl-4 sm:pl-5">
                <span
                  aria-hidden="true"
                  className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-accent bg-bg"
                />
                <header className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2 className="text-[12px] font-medium text-fg">{group.label}</h2>
                  <span className="text-[10.5px] text-muted">
                    {group.jobs.length} job{group.jobs.length === 1 ? "" : "s"} added on this page
                  </span>
                </header>

                <ul className="divide-y divide-line">
                  {group.jobs.map((job) => (
                    <li key={job.id}>
                      <div className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-3 px-1">
                        <JobCheckbox
                          id={job.id}
                          label={`${job.company || "Company not set"} — ${job.title || "Role not set"}`}
                        />
                        <Link
                          href={`/jobs/${job.id}`}
                          className="grid grid-cols-1 gap-2.5 rounded-md py-3 transition-colors hover:bg-surface-2/40 lg:grid-cols-[minmax(0,1.5fr)_120px_100px_130px] lg:items-center lg:gap-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line-2 bg-surface-2 text-[10px] font-semibold text-fg-2">
                              {companyMark(job.company || job.title || job.url)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-[12.5px] font-medium text-fg">{job.company || "Company not set"}</span>
                                <PriorityBadge priority={job.priority} />
                              </span>
                              <span className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11px] text-muted">
                                <span className="truncate">{job.title || "Role not set"}</span>
                                {job.location && <><span className="text-line-3">·</span><span className="truncate">{job.location}</span></>}
                              </span>
                              {job.salary && (
                                <span className="mt-0.5 block truncate text-[10px] text-fg-2">
                                  {job.salary}
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 lg:block">
                            <StatusPill status={job.status} />
                            <span className="text-[10px] text-muted lg:hidden">{relativeTime(job.updated_at)}</span>
                          </div>

                          <div className="hidden text-[11.5px] capitalize text-muted lg:block">
                            {job.source || "—"}
                          </div>

                          <div className="flex items-center justify-between text-[11px] lg:block lg:text-right">
                            <span className="text-[10px] text-muted lg:hidden">Deadline</span>
                            <DeadlineCell job={job} />
                          </div>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </JobsSelectionProvider>
      )}

      {!error && total > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-muted">
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <nav aria-label="Jobs pages" className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={jobsPageHref(filters, page - 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 px-2.5 text-[11.5px]")}>
                Previous
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="h-8 px-2.5 text-[11.5px]">Previous</Button>
            )}
            <span className="mono text-[11px]">{page} / {pageCount}</span>
            {page < pageCount ? (
              <Link href={jobsPageHref(filters, page + 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 px-2.5 text-[11.5px]")}>
                Next
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="h-8 px-2.5 text-[11.5px]">Next</Button>
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
