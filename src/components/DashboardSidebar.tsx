import { Icon } from "@/components/Icon";
import { Section } from "@/components/Shell";
import type { DashboardSummary } from "@/lib/dashboard";
import Link from "next/link";

const TONE_STYLES: Record<DashboardSummary["attention"][number]["tone"], string> = {
  danger: "text-danger border-danger/25 bg-danger-soft",
  warn: "text-warn border-warn/25 bg-warn-soft",
  info: "text-info border-info/25 bg-info-soft",
};

export function DashboardSidebar({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="min-w-0 space-y-4">
      <Section title="Application status">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
            <div
              role="img"
              aria-label={`Application status: ${summary.statusBreakdown.map((item) => `${item.label} ${item.count}`).join(", ")}`}
              className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
              style={{
                background: summary.donutGradient
                  ? `conic-gradient(${summary.donutGradient})`
                  : "var(--color-surface-3)",
              }}
            >
              <div className="grid h-25.5 w-25.5 place-content-center rounded-full border border-line bg-surface text-center">
                <span className="mono text-[22px] font-semibold leading-none text-fg">
                  {summary.total}
                </span>
                <span className="mt-1 text-[10px] text-muted">Total</span>
              </div>
            </div>
            <ul className="w-full min-w-0 space-y-2">
              {summary.statusBreakdown.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-muted">{item.label}</span>
                  <span className="mono shrink-0 text-fg">
                    {item.count}
                    <span className="ml-1 text-muted">
                      ({summary.total ? Math.round((item.count / summary.total) * 100) : 0}%)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section
        title="Needs attention"
        right={<span className="mono text-[11px] text-muted">{summary.attention.length}</span>}
      >
        {summary.attention.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-muted">
            Nothing urgent. Nice work.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {summary.attention.slice(0, 4).map((item) => (
              <li key={item.job.id}>
                <Link
                  href={`/jobs/${item.job.id}`}
                  className="flex items-start gap-2.5 px-4 py-3 transition hover:bg-surface-2/50"
                >
                  <span
                    className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${TONE_STYLES[item.tone]}`}
                  >
                    <Icon
                      name={
                        item.tone === "danger"
                          ? "ban"
                          : item.tone === "warn"
                            ? "calendar"
                            : "clock"
                      }
                      size={12}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11.5px] font-medium text-fg">
                      {item.job.title || item.job.company || "Untitled job"}
                    </span>
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
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line-2 bg-surface-2 text-accent">
              <Icon name="trend" size={15} />
            </span>
            <p className="text-[11.5px] leading-relaxed text-muted">
              <span className="text-fg">{summary.responseRate}% response rate</span> across{" "}
              {summary.progressed} progressed application
              {summary.progressed === 1 ? "" : "s"}.
            </p>
          </div>
          {summary.topSource && (
            <div className="flex items-center gap-3 border-t border-line pt-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line-2 bg-surface-2 text-muted">
                <Icon name="briefcase" size={15} />
              </span>
              <p className="text-[11.5px] leading-relaxed text-muted">
                Most tracked source:{" "}
                <span className="capitalize text-fg">{summary.topSource[0]}</span> ·{" "}
                {summary.topSource[1]} job{summary.topSource[1] === 1 ? "" : "s"}.
              </p>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
