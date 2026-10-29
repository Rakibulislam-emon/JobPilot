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

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/jobs/new") return pathname === "/jobs/new";
  if (href === "/jobs") {
    // /jobs and /jobs/[id] — but not /jobs/new
    return pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/jobs/new"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-col border-b border-line md:h-screen md:w-60 md:border-b-0 md:border-r">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-7 w-7 place-items-center rounded-md border border-line-2 bg-surface-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
        </div>
        <div className="leading-tight">
          <div className="text-[13.5px] font-semibold tracking-tight text-fg">
            JobDesk
          </div>
          <div className="text-[10.5px] text-muted-2">application tracker</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="no-scrollbar flex gap-0.5 overflow-x-auto px-2.5 pb-3 md:flex-col md:overflow-visible">
        {NAV.map((item) => {
          const active = isActive(item.href, pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
                active
                  ? "bg-surface-2 font-medium text-fg"
                  : "text-muted hover:bg-surface-2/60 hover:text-fg"
              }`}
            >
              <Icon
                name={item.icon}
                size={15}
                className={active ? "text-fg" : "text-muted-2 group-hover:text-muted"}
              />
              <span className="flex-1">{item.label}</span>
              <kbd className="hidden rounded border border-line bg-black/40 px-1 py-px font-mono text-[9px] text-muted-2 opacity-0 transition group-hover:opacity-100 md:inline-block">
                {item.key}
              </kbd>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto hidden border-t border-line p-3 md:block">
        <div className="mb-2 flex items-center gap-2.5 px-2 py-1.5">
          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line-2 bg-surface-2 text-[10px] font-medium text-fg-2">
            {email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11.5px] text-fg-2" title={email}>
              {email}
            </div>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] text-muted transition-colors hover:bg-surface-2/60 hover:text-fg"
          >
            <Icon name="logout" size={14} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
