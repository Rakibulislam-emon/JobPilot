import { AddJobTrigger } from "@/components/AddJobModal";
import { DashboardMainColumn } from "@/components/DashboardMainColumn";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Icon } from "@/components/Icon";
import { EmptyState, PageHeader } from "@/components/Shell";
import type { DashboardSummary } from "@/lib/dashboard";
import type { JobDashboard } from "@/lib/types";
import Link from "next/link";

export function DashboardView({
  jobs,
  email,
  summary,
}: {
  jobs: JobDashboard[];
  email: string;
  summary: DashboardSummary;
}) {
  const firstName = email.split("@")[0] || "there";

  if (summary.total === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Welcome"
          title={`Hello${email ? `, ${firstName}` : ""}`}
          subtitle="Your application pipeline starts here. Capture your first job post and we'll take it from there."
          action={{ label: "Add first job", modal: true }}
        />
        <EmptyState
          title="No jobs tracked yet"
          body="Add a job manually, or install the browser extension and capture any post — BDJobs, LinkedIn, or a Facebook group screenshot — in two clicks."
          cta={{ label: "Add your first job", modal: true }}
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-3 stagger">
          {[
            { t: "1 · Capture", d: "Extension grabs the post text + screenshot." },
            { t: "2 · Confirm", d: "AI fills the fields; you fix anything wrong." },
            { t: "3 · Track", d: "Move it through the board as you progress." },
          ].map((step) => (
            <div key={step.t} className="card min-w-0 px-4 py-4 sm:px-5">
              <div className="mono text-[11px] text-muted-2">{step.t}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.d}</div>
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
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-2">
            Your workspace
          </div>
          <h1 className="display text-[26px] text-fg md:text-[32px]">
            {summary.greeting}, {firstName}
          </h1>
          <p className="mt-1.5 text-[12px] text-muted">
            {summary.todayLabel}
            <span className="mx-2 text-line-3">·</span>
            {summary.total} tracked · {summary.thisWeek} added this week
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <form
            action="/jobs"
            method="get"
            className="relative min-w-0 flex-1 sm:w-64 sm:flex-none lg:w-72"
          >
            <Icon
              name="search"
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              name="q"
              placeholder="Search applications…"
              aria-label="Search applications"
              className="input pl-9 pr-3"
            />
          </form>
          <AddJobTrigger className="btn btn-primary w-full sm:w-auto">
            <Icon name="plus" size={14} /> Add job
          </AddJobTrigger>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 stagger">
        <DashboardStat label="Total" value={summary.total} icon="briefcase" href="/jobs" />
        <DashboardStat label="Active" value={summary.active} icon="activity" href="/jobs" />
        <DashboardStat
          label="Interviews"
          value={summary.interviews}
          icon="calendar"
          href="/jobs?status=interview"
        />
        <DashboardStat
          label="Offers"
          value={summary.offers}
          icon="gift"
          href="/jobs?status=offer"
        />
        <DashboardStat
          label="Rejected"
          value={summary.byStatus.rejected ?? 0}
          icon="ban"
          href="/jobs?status=rejected"
        />
        <DashboardStat
          label="Response"
          value={`${summary.responseRate}%`}
          icon="trend"
          hint={`${summary.responded} / ${summary.progressed}`}
          href="/jobs"
        />
      </div>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3">
        <DashboardMainColumn jobs={jobs} summary={summary} />
        <DashboardSidebar summary={summary} />
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
    <Link
      href={href}
      className="card card-hover group min-w-0 p-3 transition hover:-translate-y-0.5 sm:p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10.5px] text-muted sm:text-[11px]">{label}</span>
        <Icon
          name={icon}
          size={15}
          className="shrink-0 text-muted-2 transition group-hover:text-accent"
        />
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="mono text-[24px] font-semibold leading-none tracking-tight text-fg sm:text-[27px]">
          {value}
        </span>
        {hint && <span className="text-[9.5px] text-muted-2">{hint}</span>}
      </div>
    </Link>
  );
}
