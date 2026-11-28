import { STATUS_ORDER } from "@/lib/constants";
import { daysSince, daysUntil } from "@/lib/format";
import type { JobDashboard } from "@/lib/types";

const DHAKA_DAY_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const DHAKA_DATE_LABEL = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  weekday: "long",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const DHAKA_HOUR = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  hour: "numeric",
  hourCycle: "h23",
});
const ACTIVITY_DATE_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Dhaka",
});
const CLOSED_STATUSES = new Set(["offer", "rejected", "ghosted", "withdrawn", "skipped"]);

export type Attention = {
  job: JobDashboard;
  reason: string;
  tone: "danger" | "warn" | "info";
};

export type ActivityPoint = {
  key: string;
  label: string;
  count: number;
};

export type DashboardSummary = {
  byStatus: Record<string, number>;
  total: number;
  active: number;
  interviews: number;
  offers: number;
  progressed: number;
  responded: number;
  responseRate: number;
  thisWeek: number;
  attention: Attention[];
  activitySeries: ActivityPoint[];
  todayLabel: string;
  greeting: string;
  statusBreakdown: { label: string; count: number; color: string }[];
  donutGradient: string;
  topSource: [string, number] | undefined;
};

function dhakaDayKey(date: Date): string {
  const parts = DHAKA_DAY_PARTS.formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getDashboardSummary(jobs: JobDashboard[], now = new Date()): DashboardSummary {
  const byStatus = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])) as Record<
    string,
    number
  >;
  const bySource: Record<string, number> = {};
  const activityCounts = new Map<string, number>();
  const attention: Attention[] = [];
  let thisWeek = 0;
  const todayKey = dhakaDayKey(now);
  const todayUtc = Date.parse(`${todayKey}T00:00:00Z`);
  const firstActivityKey = new Date(todayUtc - 29 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  for (const job of jobs) {
    byStatus[job.status] = (byStatus[job.status] ?? 0) + 1;

    const source = job.source || "unknown";
    bySource[source] = (bySource[source] ?? 0) + 1;

    const daysOld = daysSince(job.created_at);
    if (daysOld !== null && daysOld <= 7) thisWeek++;

    const dayKey = dhakaDayKey(new Date(job.created_at));
    if (dayKey >= firstActivityKey && dayKey <= todayKey) {
      activityCounts.set(dayKey, (activityCounts.get(dayKey) ?? 0) + 1);
    }

    if (CLOSED_STATUSES.has(job.status)) continue;

    if (job.deadline) {
      const daysLeft = daysUntil(job.deadline);
      if (daysLeft !== null) {
        if (daysLeft < 0 && job.status === "saved") {
          attention.push({
            job,
            reason: `Deadline passed ${Math.abs(daysLeft)}d ago`,
            tone: "danger",
          });
          continue;
        }
        if (daysLeft >= 0 && daysLeft <= 3) {
          attention.push({
            job,
            reason: daysLeft === 0 ? "Deadline is today" : `Deadline in ${daysLeft}d`,
            tone: daysLeft === 0 ? "danger" : "warn",
          });
          continue;
        }
      }
    }

    if (job.status === "applied") {
      const stale = daysSince(job.updated_at);
      if (stale !== null && stale >= 7) {
        attention.push({
          job,
          reason: `Applied ${stale}d ago — follow up?`,
          tone: "info",
        });
      }
    }
  }

  const total = jobs.length;
  const active =
    (byStatus.saved ?? 0) + (byStatus.applied ?? 0) + (byStatus.oa ?? 0) + (byStatus.interview ?? 0);
  const interviews = byStatus.interview ?? 0;
  const offers = byStatus.offer ?? 0;
  const progressed =
    (byStatus.applied ?? 0) +
    (byStatus.interview ?? 0) +
    (byStatus.oa ?? 0) +
    (byStatus.offer ?? 0) +
    (byStatus.rejected ?? 0);
  const responded =
    (byStatus.interview ?? 0) +
    (byStatus.oa ?? 0) +
    (byStatus.offer ?? 0) +
    (byStatus.rejected ?? 0);
  const responseRate = progressed > 0 ? Math.round((responded / progressed) * 100) : 0;
  const activitySeries = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(todayUtc - (29 - index) * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: ACTIVITY_DATE_LABEL.format(date),
      count: activityCounts.get(key) ?? 0,
    };
  });
  const sourceEntries = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  const statusBreakdown = [
    { label: "Active", count: (byStatus.saved ?? 0) + (byStatus.applied ?? 0), color: "#ededed" },
    { label: "Interview", count: interviews, color: "#a3a3a3" },
    { label: "Assessment / training", count: byStatus.oa ?? 0, color: "#737373" },
    { label: "Offers", count: offers, color: "#14b8a6" },
    { label: "Rejected", count: byStatus.rejected ?? 0, color: "#525252" },
    {
      label: "Other",
      count: (byStatus.ghosted ?? 0) + (byStatus.withdrawn ?? 0),
      color: "#303030",
    },
    { label: "Skipped", count: byStatus.skipped ?? 0, color: "#404040" },
  ].filter((item) => item.count > 0);
  let donutPosition = 0;
  const donutGradient = statusBreakdown
    .map((item) => {
      const start = donutPosition;
      donutPosition += total ? (item.count / total) * 100 : 0;
      return `${item.color} ${start}% ${donutPosition}%`;
    })
    .join(", ");
  const hour = Number(DHAKA_HOUR.format(now));

  return {
    byStatus,
    total,
    active,
    interviews,
    offers,
    progressed,
    responded,
    responseRate,
    thisWeek,
    attention,
    activitySeries,
    todayLabel: DHAKA_DATE_LABEL.format(now),
    greeting: hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
    statusBreakdown,
    donutGradient,
    topSource: sourceEntries[0],
  };
}
