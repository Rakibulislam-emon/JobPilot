import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string; icon?: "plus" | "camera" };
  eyebrow?: string;
}) {
  return (
    <header className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-line pb-5 sm:mb-8 sm:gap-4 sm:pb-6">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="mb-2 text-[11px] font-medium text-muted-2">{eyebrow}</div>
        )}
        <h1 className="display text-[26px] text-fg md:text-[30px]">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <Link href={action.href} className="btn btn-primary shrink-0">
          <Icon name={action.icon ?? "plus"} size={14} />
          {action.label}
        </Link>
      )}
    </header>
  );
}

export function EmptyState({
  title,
  body,
  cta,
  icon = "briefcase",
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
  icon?: "briefcase" | "grid" | "search";
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-2 px-6 py-16 text-center">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-line-2 bg-surface-2">
        <Icon name={icon} size={17} className="text-muted" />
      </div>
      <h3 className="text-[14px] font-medium tracking-tight text-fg">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">
        {body}
      </p>
      {cta && (
        <Link href={cta.href} className="btn btn-primary mt-5">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function Section({
  title,
  right,
  children,
  className = "",
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 className="text-[12px] font-medium text-fg-2">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = false,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="card card-hover min-w-0 p-3 sm:p-4">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`mono min-w-0 text-[26px] font-semibold leading-none tracking-tight ${
            accent ? "text-accent" : "text-fg"
          }`}
        >
          {value}
        </span>
        {trend && (
          <span
            className={`text-[11px] font-medium ${
              trend.positive ? "text-success" : "text-danger"
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {hint && <div className="mt-1.5 break-words text-[11.5px] text-muted-2">{hint}</div>}
    </div>
  );
}
