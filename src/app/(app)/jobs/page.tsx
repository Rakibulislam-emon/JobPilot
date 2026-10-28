import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { SOURCES, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { createClient, requireUser } from "@/lib/supabase/server";
import { daysUntil, formatDate, relativeTime } from "@/lib/format";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

function DeadlineCell({ job }: { job: Job }) {
  if (!job.deadline) return <span className="text-muted/50">—</span>;
  const d = daysUntil(job.deadline);
  const done = ["offer", "rejected", "ghosted", "withdrawn"].includes(job.status);

  let tone = "text-muted";
  if (!done && d !== null) {
    if (d < 0) tone = "text-rose-300";
    else if (d <= 3) tone = "text-amber-300";
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
    q?: string;
    status?: string;
    source?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const q = (sp.q ?? "").trim();
  const status = sp.status && STATUS_ORDER.includes(sp.status as never) ? sp.status : "";
  const source = sp.source ?? "";
  const sort = sp.sort ?? "new";

  let query = supabase.from("jobs").select("*").eq("user_id", user.id);

  if (q) {
    const safe = q.replace(/[%,()]/g, " ").trim();
    query = query.or(`company.ilike.%${safe}%,title.ilike.%${safe}%,notes.ilike.%${safe}%`);
  }
  if (status) query = query.eq("status", status);
  if (source) query = query.eq("source", source);

  if (sort === "deadline") {
    query = query.order("deadline", { ascending: true, nullsFirst: false });
  } else if (sort === "company") {
    query = query.order("company", { ascending: true });
  } else if (sort === "updated") {
    query = query.order("updated_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data } = await query.limit(300);
  const jobs = (data ?? []) as Job[];

  const hasFilters = Boolean(q || status || source || (sort && sort !== "new"));

  return (
    <div className="animate-in">
      <PageHeader
        title="Jobs"
        subtitle={`${jobs.length} result${jobs.length === 1 ? "" : "s"}${
          hasFilters ? " (filtered)" : ""
        }`}
        action={{ href: "/jobs/new", label: "Add job" }}
      />

      <form
        method="get"
        className="card mb-4 flex flex-wrap items-end gap-2 p-3"
      >
        <div className="relative min-w-[180px] flex-1">
          <Icon
            name="search"
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search company, role, notes…"
            className="input pl-8"
          />
        </div>

        <select name="status" defaultValue={status} className="input w-auto min-w-[140px]">
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>

        <select name="source" defaultValue={source} className="input w-auto min-w-[130px]">
          <option value="">All sources</option>
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select name="sort" defaultValue={sort} className="input w-auto min-w-[130px]">
          <option value="new">Newest first</option>
          <option value="updated">Recently updated</option>
          <option value="deadline">Deadline soon</option>
          <option value="company">Company A–Z</option>
        </select>

        <button type="submit" className="btn btn-ghost">
          Apply
        </button>
        {hasFilters && (
          <Link href="/jobs" className="btn btn-ghost text-muted">
            Reset
          </Link>
        )}
      </form>

      {jobs.length === 0 ? (
        <div className="card px-6 py-14 text-center">
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
          <div className="hidden grid-cols-[1fr_120px_100px_110px_90px] gap-3 border-b border-line px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted md:grid">
            <span>Role / company</span>
            <span>Status</span>
            <span>Source</span>
            <span>Deadline</span>
            <span className="text-right">Updated</span>
          </div>

          <ul className="divide-y divide-line/60">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="group grid grid-cols-1 gap-2 px-4 py-3.5 transition hover:bg-surface-2/40 md:grid-cols-[1fr_120px_100px_110px_90px] md:items-center md:gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium">
                        {job.title || "(untitled role)"}
                      </span>
                      {job.priority <= 2 && (
                        <span className="pill border-accent/30 bg-accent-soft px-1.5 py-0 text-[9.5px] text-accent">
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
    </div>
  );
}
