import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string; icon?: "plus" | "camera" };
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
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
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand/10 ring-1 ring-brand/25">
        <span className="h-2.5 w-2.5 rounded-full bg-brand" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted">{body}</p>
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
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}
