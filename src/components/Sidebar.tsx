"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const NAV = [
  { href: "/", label: "Dashboard", icon: "grid" as const, key: "D" },
  { href: "/jobs", label: "Jobs", icon: "briefcase" as const, key: "J" },
  { href: "/board", label: "Board", icon: "columns" as const, key: "B" },
  { href: "/jobs/new", label: "Add job", icon: "plus" as const, key: "N" },
  { href: "/settings", label: "Settings", icon: "settings" as const, key: "S" },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-col border-b border-line md:h-screen md:w-64 md:border-b-0 md:border-r">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 md:py-6">
        <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-accent-soft ring-1 ring-accent/30">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_16px_3px_rgba(20,184,166,.5)]" />
        </div>
        <div className="leading-none">
          <div className="font-display text-[17px] font-normal tracking-tight text-fg">
            Job<span className="text-accent">Desk</span>
          </div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-2">
            application tracker
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                (item.href !== "/jobs/new" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-fg"
              } flex`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_8px_1px_rgba(20,184,166,.6)]" />
              )}
              <Icon name={item.icon} size={16} />
              <span className="flex-1">{item.label}</span>
              <kbd className="hidden rounded border border-line bg-surface-2/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-2 opacity-0 transition group-hover:opacity-100 md:inline-block">
                {item.key}
              </kbd>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto hidden border-t border-line p-4 md:block">
        <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-surface-2/50 px-3 py-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            {email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-fg">{email}</div>
            <div className="text-[10px] text-muted-2">owner account</div>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-subtle w-full justify-start">
            <Icon name="logout" size={14} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
