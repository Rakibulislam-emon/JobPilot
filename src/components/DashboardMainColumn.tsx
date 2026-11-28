import { DashboardActivityChart } from "@/components/DashboardActivityChart";
import { Section } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import type { DashboardSummary } from "@/lib/dashboard";
import { relativeTime } from "@/lib/format";
import type { JobDashboard } from "@/lib/types";
import Link from "next/link";

export function DashboardMainColumn({
  jobs,
  summary,
}: {
  jobs: JobDashboard[];
  summary: DashboardSummary;
}) {
  return (
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
          <DashboardActivityChart series={summary.activitySeries} />
        </div>
      </section>

      <Section
        title="Recent applications"
        right={
          <Link href="/jobs" className="text-[11px] text-muted transition hover:text-fg">
            View all <span aria-hidden="true">→</span>
          </Link>
        }
      >
        <div className="divide-y divide-line">
          {jobs.slice(0, 5).map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-surface-2/50 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-2 bg-surface-2 text-[10px] font-semibold text-fg-2">
                  {initials(job.company || job.title)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-medium text-fg">
                    {job.company || "Company not set"}
                  </span>
                  <span className="block truncate text-[10.5px] text-muted sm:hidden">
                    {job.title || "Role not set"}
                  </span>
                </span>
              </div>
              <span className="hidden truncate text-[11.5px] text-muted sm:block">
                {job.title || "Role not set"}
              </span>
              <StatusPill status={job.status} />
              <span className="hidden text-right text-[10.5px] text-muted sm:block">
                {relativeTime(job.created_at)}
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}

function initials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}
