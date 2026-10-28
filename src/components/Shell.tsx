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
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted">
            {eyebrow}
          </div>
        )}
        <h1 className="display text-[32px] font-normal tracking-tight text-fg md:text-[40px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <Link href={action.href} className="btn btn-primary">
          <Icon name={action.icon ?? "plus"} size={15} />
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
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft ring-1 ring-accent/20">
        <Icon name={icon} size={22} className="text-accent" />
      </div>
      <h3 className="font-display text-[18px] font-normal tracking-tight text-fg">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
        {body}
      </p>
      {cta && (
        <Link href={cta.href} className="btn btn-primary mt-6">
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
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {title}
        </h2>
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
    <div className="card card-hover p-5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`font-display text-[34px] font-normal leading-none tracking-tight ${accent ? "text-accent" : "text-fg"}`}>
          {value}
        </span>
        {trend && (
          <span className={`text-[11px] font-medium ${trend.positive ? "text-success" : "text-danger"}`}>
            {trend.value}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-2 text-[11.5px] text-muted-2">{hint}</div>
      )}
    </div>
  );
}
