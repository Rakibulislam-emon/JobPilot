import { Icon } from "@/components/Icon";
import { EmptyState, PageHeader, Section } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { STATUS_ORDER } from "@/lib/constants";
import { daysSince, daysUntil, relativeTime } from "@/lib/format";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Attention = {
  job: Job;
  reason: string;
  tone: "danger" | "warn" | "info";
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [jobsResult, activityResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select("id, kind, note, happened_at, from_status, to_status, job_id")
      .eq("user_id", user.id)
      .order("happened_at", { ascending: false })
      .limit(10),
  ]);

  const jobs = (jobsResult.data ?? []) as Job[];
  const activities = activityResult.data ?? [];

  const byStatus = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = jobs.filter((j) => j.status === s).length;
    return acc;
  }, {});

  const total = jobs.length;
  const active =
    (byStatus.saved ?? 0) + (byStatus.applied ?? 0) + (byStatus.oa ?? 0) + (byStatus.interview ?? 0);
  const interviews = (byStatus.interview ?? 0) + (byStatus.oa ?? 0);
  const offers = byStatus.offer ?? 0;
  const progressed =
    (byStatus.applied ?? 0) +
    (byStatus.oa ?? 0) +
    (byStatus.interview ?? 0) +
    (byStatus.offer ?? 0) +
    (byStatus.rejected ?? 0);
  const responded =
    (byStatus.oa ?? 0) +
    (byStatus.interview ?? 0) +
    (byStatus.offer ?? 0) +
    (byStatus.rejected ?? 0);
  const responseRate = progressed > 0 ? Math.round((responded / progressed) * 100) : 0;

  const thisWeek = jobs.filter((j) => {
    const d = daysSince(j.created_at);
    return d !== null && d <= 7;
  }).length;

  // ── Needs attention ────────────────────────────────────────
  const attention: Attention[] = [];

  for (const job of jobs) {
    if (["offer", "rejected", "ghosted", "withdrawn"].includes(job.status)) continue;

    if (job.deadline) {
      const d = daysUntil(job.deadline);
      if (d !== null) {
        if (d < 0 && job.status === "saved") {
          attention.push({ job, reason: `Deadline passed ${Math.abs(d)}d ago`, tone: "danger" });
          continue;
        }
        if (d >= 0 && d <= 3) {
          attention.push({
            job,
            reason: d === 0 ? "Deadline is today" : `Deadline in ${d}d`,
            tone: d === 0 ? "danger" : "warn",
          });
          continue;
        }
      }
    }

    if (job.status === "applied") {
      const stale = daysSince(job.updated_at);
      if (stale !== null && stale >= 7) {
        attention.push({ job, reason: `Applied ${stale}d ago — follow up?`, tone: "info" });
      }
    }
  }

  const toneStyles: Record<Attention["tone"], string> = {
    danger: "text-danger border-danger/25 bg-danger-soft",
    warn: "text-warn border-warn/25 bg-warn-soft",
    info: "text-info border-info/25 bg-info-soft",
  };

  // ── Source breakdown ───────────────────────────────────────
  const bySource = jobs.reduce<Record<string, number>>((acc, j) => {
    const key = j.source || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const sourceEntries = Object.entries(bySource).sort((a, b) => b[1] - a[1]);

  const maxStatus = Math.max(1, ...Object.values(byStatus));
  const today = new Date();
  const activitySeries = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: jobs.filter((job) => job.created_at.slice(0, 10) === key).length,
    };
  });
  const greeting =
    today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening";
  const firstName = user.email?.split("@")[0] || "there";
  const statusBreakdown = [
    { label: "Active", count: (byStatus.saved ?? 0) + (byStatus.applied ?? 0), color: "#ededed" },
    { label: "Interview stage", count: interviews, color: "#a3a3a3" },
    { label: "Offers", count: offers, color: "#14b8a6" },
    { label: "Rejected", count: byStatus.rejected ?? 0, color: "#525252" },
    { label: "Other", count: (byStatus.ghosted ?? 0) + (byStatus.withdrawn ?? 0), color: "#303030" },
  ].filter((item) => item.count > 0);
  let donutPosition = 0;
  const donutGradient = statusBreakdown.map((item) => {
    const start = donutPosition;
    donutPosition += total ? (item.count / total) * 100 : 0;
    return `${item.color} ${start}% ${donutPosition}%`;
  }).join(", ");
  const topSource = sourceEntries[0];

  if (total === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Welcome"
          title={`Hello${user.email ? `, ${user.email.split("@")[0]}` : ""}`}
          subtitle="Your application pipeline starts here. Capture your first job post and we'll take it from there."
          action={{ href: "/jobs/new", label: "Add first job" }}
        />
        <EmptyState
          title="No jobs tracked yet"
          body="Add a job manually, or install the browser extension and capture any post — BDJobs, LinkedIn, or a Facebook group screenshot — in two clicks."
          cta={{ href: "/jobs/new", label: "Add your first job" }}
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-3 stagger">
          {[
            { t: "1 · Capture", d: "Extension grabs the post text + screenshot." },
            { t: "2 · Confirm", d: "AI fills the fields; you fix anything wrong." },
            { t: "3 · Track", d: "Move it through the board as you progress." },
          ].map((s) => (
            <div key={s.t} className="card min-w-0 px-4 py-4 sm:px-5">
              <div className="mono text-[11px] text-muted-2">{s.t}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.d}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="animate-in min-w-0">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5 sm:mb-8 sm:pb-6">
        <div className="min-w-0">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-2">Your workspace</div>
          <h1 className="display text-[26px] text-fg md:text-[32px]">{greeting}, {firstName}</h1>
          <p className="mt-1.5 text-[12px] text-muted">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
            <span className="mx-2 text-line-3">·</span>
            {total} tracked · {thisWeek} added this week
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <form action="/jobs" method="get" className="relative min-w-0 flex-1 sm:w-64 sm:flex-none lg:w-72">
            <Icon name="search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" placeholder="Search applications…" aria-label="Search applications" className="input pl-9 pr-3" />
          </form>
          <Link href="/jobs/new" className="btn btn-primary w-full sm:w-auto">
            <Icon name="plus" size={14} /> Add job
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 stagger">
        <DashboardStat label="Total" value={total} icon="briefcase" href="/jobs" />
        <DashboardStat label="Active" value={active} icon="activity" href="/jobs" />
        <DashboardStat label="Interviews" value={interviews} icon="calendar" href="/jobs?status=interview" />
        <DashboardStat label="Offers" value={offers} icon="gift" href="/jobs?status=offer" />
        <DashboardStat label="Rejected" value={byStatus.rejected ?? 0} icon="ban" href="/jobs?status=rejected" />
        <DashboardStat label="Response" value={`${responseRate}%`} icon="trend" hint={`${responded} / ${progressed}`} href="/jobs" />
      </div>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 xl:col-span-2">
          <section className="card overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-[13px] font-medium text-fg">Application activity</h2>
                <p className="mt-0.5 text-[11px] text-muted">Jobs added · last 30 days</p>
              </div>
              <span className="pill border-line-2 bg-transparent text-muted">30 days</span>
            </div>
            <div className="px-3 pb-3 pt-4 sm:px-5">
              <ActivityChart series={activitySeries} />
            </div>
          </section>

          <Section
            title="Recent applications"
            right={<Link href="/jobs" className="text-[11px] text-muted transition hover:text-fg">View all <span aria-hidden="true">→</span></Link>}
          >
            {jobs.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-muted">No applications yet.</div>
            ) : (
              <div className="divide-y divide-line">
                {jobs.slice(0, 5).map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-surface-2/50 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] sm:px-5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-2 bg-surface-2 text-[10px] font-semibold text-fg-2">{initials(job.company || job.title)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-fg">{job.company || "Company not set"}</span>
                        <span className="block truncate text-[10.5px] text-muted sm:hidden">{job.title || "Role not set"}</span>
                      </span>
                    </div>
                    <span className="hidden truncate text-[11.5px] text-muted sm:block">{job.title || "Role not set"}</span>
                    <StatusPill status={job.status} />
                    <span className="hidden text-right text-[10.5px] text-muted sm:block">{relativeTime(job.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="min-w-0 space-y-4">
          <Section title="Application status">
            <div className="p-4 sm:p-5">
              <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
                <div role="img" aria-label={`Application status: ${statusBreakdown.map((x) => `${x.label} ${x.count}`).join(", ")}`} className="grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: donutGradient ? `conic-gradient(${donutGradient})` : "var(--color-surface-3)" }}>
                  <div className="grid h-25.5 w-25.5 place-content-center rounded-full border border-line bg-surface text-center">
                    <span className="mono text-[22px] font-semibold leading-none text-fg">{total}</span>
                    <span className="mt-1 text-[10px] text-muted">Total</span>
                  </div>
                </div>
                <ul className="w-full min-w-0 space-y-2">
                  {statusBreakdown.map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="min-w-0 flex-1 truncate text-muted">{item.label}</span>
                      <span className="mono shrink-0 text-fg">{item.count}<span className="ml-1 text-muted">({total ? Math.round((item.count / total) * 100) : 0}%)</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Needs attention" right={<span className="mono text-[11px] text-muted">{attention.length}</span>}>
            {attention.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-muted">Nothing urgent. Nice work.</div>
            ) : (
              <ul className="divide-y divide-line">
                {attention.slice(0, 4).map((item) => (
                  <li key={item.job.id}>
                    <Link href={`/jobs/${item.job.id}`} className="flex items-start gap-2.5 px-4 py-3 transition hover:bg-surface-2/50">
                      <span className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${toneStyles[item.tone]}`}>
                        <Icon name={item.tone === "danger" ? "ban" : item.tone === "warn" ? "calendar" : "clock"} size={12} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11.5px] font-medium text-fg">{item.job.title || item.job.company || "Untitled job"}</span>
                        <span className="mt-0.5 block text-[10.5px] text-muted">{item.reason}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Your snapshot">
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line-2 bg-surface-2 text-accent"><Icon name="trend" size={15} /></span>
                <p className="text-[11.5px] leading-relaxed text-muted"><span className="text-fg">{responseRate}% response rate</span> across {progressed} progressed application{progressed === 1 ? "" : "s"}.</p>
              </div>
              {topSource && (
                <div className="flex items-center gap-3 border-t border-line pt-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line-2 bg-surface-2 text-muted"><Icon name="briefcase" size={15} /></span>
                  <p className="text-[11.5px] leading-relaxed text-muted">Most tracked source: <span className="capitalize text-fg">{topSource[0]}</span> · {topSource[1]} job{topSource[1] === 1 ? "" : "s"}.</p>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function DashboardStat({
  label,
  value,
  icon,
  href,
  hint,
}: {
  label: string;
  value: string | number;
  icon: "briefcase" | "activity" | "calendar" | "gift" | "ban" | "trend";
  href: string;
  hint?: string;
}) {
  return (
    <Link href={href} className="card card-hover group min-w-0 p-3 transition hover:-translate-y-0.5 sm:p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10.5px] text-muted sm:text-[11px]">{label}</span>
        <Icon name={icon} size={15} className="shrink-0 text-muted-2 transition group-hover:text-accent" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="mono text-[24px] font-semibold leading-none tracking-tight text-fg sm:text-[27px]">{value}</span>
        {hint && <span className="text-[9.5px] text-muted-2">{hint}</span>}
      </div>
    </Link>
  );
}

function ActivityChart({ series }: { series: { key: string; label: string; count: number }[] }) {
  const width = 720;
  const baseline = 166;
  const max = Math.max(4, ...series.map((point) => point.count));
  const coords = series.map((point, index) => ({
    ...point,
    x: 34 + (index * 652) / Math.max(1, series.length - 1),
    y: 18 + ((max - point.count) / max) * 138,
  }));
  const points = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${coords[0]?.x ?? 34},${baseline} ${points} ${coords.at(-1)?.x ?? 686},${baseline}`;
  const ticks = [max, Math.ceil(max * 0.75), Math.ceil(max * 0.5), Math.ceil(max * 0.25), 0];
  const labels = [0, 7, 14, 21, 29].map((index) => coords[index]).filter(Boolean);

  if (!series.some((point) => point.count > 0)) {
    return <div className="grid h-52 place-items-center text-[12px] text-muted">Your saved jobs will appear here over time.</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} 212`} className="h-48 w-full overflow-visible sm:h-56" role="img" aria-label={`Applications added in the last 30 days; peak daily count ${max}`}>
      <defs>
        <linearGradient id="activity-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ededed" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ededed" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {ticks.map((tick, index) => {
        const y = 18 + index * 34.5;
        return (
          <g key={`${tick}-${index}`}>
            <line x1="34" x2="686" y1={y} y2={y} stroke="#262626" strokeDasharray="3 5" />
            <text x="25" y={y + 3} textAnchor="end" fill="#737373" fontSize="9">{tick}</text>
          </g>
        );
      })}
      <polygon points={area} fill="url(#activity-fill)" />
      <polyline points={points} fill="none" stroke="#ededed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((point) => point.count > 0 ? (
        <circle key={point.key} cx={point.x} cy={point.y} r="2.5" fill="#ededed"><title>{point.label}: {point.count} added</title></circle>
      ) : null)}
      {labels.map((point) => <text key={point.key} x={point.x} y="196" textAnchor="middle" fill="#737373" fontSize="9">{point.label}</text>)}
    </svg>
  );
}

function initials(value: string): string {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}