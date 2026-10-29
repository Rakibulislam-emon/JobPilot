import Link from "next/link";
import { EmptyState, PageHeader, Section, StatCard } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { Icon } from "@/components/Icon";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { createClient, requireUser } from "@/lib/supabase/server";
import { daysSince, daysUntil, relativeTime, truncate } from "@/lib/format";
import type { Job, Status } from "@/lib/types";

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
            <div key={s.t} className="card px-5 py-4">
              <div className="mono text-[11px] text-muted-2">
                {s.t}
              </div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.d}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle={`${total} job${total === 1 ? "" : "s"} tracked · ${thisWeek} added this week`}
        action={{ href: "/jobs/new", label: "Add job" }}
      />

      {/* Bento stat grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 stagger">
        <StatCard label="In pipeline" value={active} hint={`${total} total tracked`} accent />
        <StatCard label="Applied" value={byStatus.applied ?? 0} hint="waiting for reply" />
        <StatCard label="OA / Interview" value={interviews} hint="in progress" />
        <StatCard label="Offers" value={offers} hint={offers > 0 ? "🎉 congrats" : "keep going"} accent={offers > 0} />
        <StatCard label="Response rate" value={`${responseRate}%`} hint={`${responded} of ${progressed} replied`} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Needs attention */}
          <Section
            title="Needs attention"
            right={
              <span className="mono text-[11px] text-muted">{attention.length}</span>
            }
          >
            {attention.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12.5px] text-muted">
                Nothing urgent. Nice work.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {attention.slice(0, 6).map((a) => (
                  <li key={a.job.id}>
                    <Link
                      href={`/jobs/${a.job.id}`}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-fg">
                          {a.job.title || "(untitled role)"}
                        </div>
                        <div className="truncate text-[12px] text-muted">
                          {a.job.company || "Unknown company"}
                        </div>
                      </div>
                      <span
                        className={`pill shrink-0 border ${toneStyles[a.tone]}`}
                      >
                        {a.reason}
                      </span>
                      <Icon
                        name="external"
                        size={13}
                        className="shrink-0 text-muted-2 opacity-0 transition group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Recent activity */}
          <Section title="Recent activity">
            {activities.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12.5px] text-muted">
                No activity yet.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {activities.map((a) => {
                  const job = jobs.find((j) => j.id === a.job_id);
                  return (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-2 text-muted">
                        <Icon
                          name={a.kind === "status" ? "columns" : a.kind === "note" ? "note" : "plus"}
                          size={12}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] leading-relaxed">
                          {a.kind === "status" ? (
                            <>
                              Moved{" "}
                              <span className="font-medium text-fg">
                                {truncate(job?.company || job?.title || "job", 40)}
                              </span>{" "}
                              to{" "}
                              <span className="font-medium text-fg">
                                {STATUS_META[(a.to_status as Status) ?? "saved"]?.label}
                              </span>
                            </>
                          ) : a.kind === "note" ? (
                            <>
                              Note on{" "}
                              <span className="font-medium text-fg">
                                {truncate(job?.company || job?.title || "job", 40)}
                              </span>
                              : “{truncate(a.note, 48)}”
                            </>
                          ) : (
                            <>
                              Added{" "}
                              <span className="font-medium text-fg">
                                {truncate(job?.company || job?.title || "a job", 40)}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-2">
                          {relativeTime(a.happened_at)}
                        </div>
                      </div>
                      {job && (
                        <Link
                          href={`/jobs/${job.id}`}
                          className="shrink-0 text-muted-2 transition hover:text-fg"
                          aria-label="Open job"
                        >
                          <Icon name="external" size={13} />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          {/* Pipeline */}
          <Section title="Pipeline">
            <div className="space-y-3 px-4 py-4">
              {STATUS_ORDER.filter((s) => (byStatus[s] ?? 0) > 0).map((s) => (
                <div key={s}>
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span className="text-muted">{STATUS_META[s].label}</span>
                    <span className="mono text-fg">{byStatus[s]}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={`h-full rounded-full ${STATUS_META[s].bar}`}
                      style={{
                        width: `${Math.max(4, (byStatus[s] / maxStatus) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {STATUS_ORDER.every((s) => (byStatus[s] ?? 0) === 0) && (
                <div className="text-center text-[12px] text-muted-2">No jobs yet</div>
              )}
            </div>
          </Section>

          {/* Sources */}
          <Section title="Sources">
            {sourceEntries.length === 0 ? (
              <div className="px-5 py-8 text-center text-[12px] text-muted-2">—</div>
            ) : (
              <div className="space-y-2.5 px-4 py-4">
                {sourceEntries.map(([source, count]) => (
                  <div
                    key={source}
                    className="flex items-center justify-between text-[12.5px]"
                  >
                    <span className="capitalize text-muted">{source}</span>
                    <span className="mono text-fg">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Quick jump */}
          <Section title="Recent jobs">
            <div className="space-y-0.5 p-1.5">
              {jobs.slice(0, 5).map((j) => (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-surface-2/60"
                >
                  <StatusPill status={j.status} />
                  <span className="truncate text-[12.5px] text-muted group-hover:text-fg">
                    {j.company || j.title || "untitled"}
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
