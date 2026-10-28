"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const NAV = [
  { href: "/", label: "Dashboard", icon: "grid" as const, mobile: true },
  { href: "/jobs", label: "Jobs", icon: "briefcase" as const, mobile: true },
  { href: "/board", label: "Board", icon: "columns" as const, mobile: true },
  { href: "/jobs/new", label: "Add job", icon: "plus" as const, mobile: false },
  { href: "/settings", label: "Settings", icon: "settings" as const, mobile: true },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-col border-line/70 md:h-screen md:w-60 md:border-r">
      <div className="sticky top-0 z-20 border-b border-line/60 bg-ink/90 backdrop-blur md:static md:border-0 md:bg-transparent">
        <div className="flex items-center gap-2.5 px-5 py-4 md:py-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 ring-1 ring-brand/30">
            <span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_12px_2px_rgba(20,184,166,.6)]" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">
              Job<span className="text-brand">Desk</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted">
              application tracker
            </div>
          </div>
        </div>

        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
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
                className={`group ${item.mobile ? "flex" : "hidden md:flex"} shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                  active
                    ? "bg-brand/12 text-brand ring-1 ring-brand/25"
                    : "text-muted hover:bg-panel2/60 hover:text-fg"
                }`}
              >
                <Icon name={item.icon} size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto hidden border-t border-line/70 p-3 md:block">
        <div className="mb-2 truncate px-1 text-[11px] text-muted">{email}</div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-ghost w-full justify-start">
            <Icon name="logout" size={14} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
