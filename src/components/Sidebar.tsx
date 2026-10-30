"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
    return (
      pathname === "/jobs" ||
      (pathname.startsWith("/jobs/") && !pathname.startsWith("/jobs/new"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  email: string;
}

export function Sidebar({ email }: SidebarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileMenuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  // Close whenever the route changes (covers back/forward, programmatic nav)
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleNavClick = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Persistent mobile app bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur-md md:hidden">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="JobDesk dashboard"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line-2 bg-surface-2 text-fg">
            <Icon name="briefcase" size={15} />
          </span>
          <span className="truncate text-[14px] font-semibold tracking-tight text-fg">JobDesk</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="app-sidebar"
        >
          <Icon name="menu" size={20} />
        </button>
      </div>

      {/* Mobile overlay */}
      <div
        aria-hidden={!mobileMenuOpen}
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar */}
      <aside
        id="app-sidebar"
        aria-label="Primary"
        className={`fixed left-0 top-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col border-r border-line bg-bg shadow-2xl transition-transform duration-300 ease-in-out motion-reduce:transition-none md:static md:w-60 md:shrink-0 md:max-w-none md:translate-x-0 md:shadow-none ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="absolute right-2 top-2 flex items-center justify-center rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
          aria-label="Close menu"
        >
          <Icon name="close" size={18} />
        </button>

        {/* Brand */}
        <Link
          href="/"
          onClick={handleNavClick}
          aria-label="JobDesk dashboard"
          className="flex items-center gap-2.5 px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:px-5 sm:py-5"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line-2 bg-surface-2 text-fg">
            <Icon name="briefcase" size={15} />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13.5px] font-semibold tracking-tight text-fg">
              JobDesk
            </div>
            <div className="truncate text-[10.5px] text-muted-2">
              application tracker
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav aria-label="Workspace" className="flex flex-1 flex-col overflow-y-auto px-3 pb-3">
          <div className="mb-2 mt-4 hidden px-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-2 md:block">
            Workspace
          </div>
          <div className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(item.href, pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-10 items-center gap-3 rounded-lg px-2.5 py-2 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active
                    ? "bg-surface-2 font-medium text-fg before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-fg"
                    : "text-muted hover:bg-surface-2/60 hover:text-fg"
                }`}
              >
                <Icon
                  name={item.icon}
                  size={15}
                  className={
                    active ? "text-fg" : "text-muted-2 group-hover:text-muted"
                  }
                />
                <span className="flex-1 truncate">{item.label}</span>
                <kbd className="hidden rounded border border-line-2 px-1.5 py-0.5 text-[10px] text-muted-2 md:inline-block">
                  {item.key}
                </kbd>
              </Link>
            );
          })}
          </div>
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-2 bg-surface-2 text-[11px] font-medium text-fg">
              {email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-medium text-fg" title={email}>
                {email}
              </div>
              <div className="mt-0.5 text-[9.5px] text-muted-2">Personal workspace</div>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] text-muted transition-colors hover:bg-surface-2/60 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Icon name="logout" size={14} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Primary mobile navigation keeps page switching one tap away */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {NAV.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={handleNavClick}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                active ? "text-fg" : "text-muted hover:text-fg"
              }`}
            >
              <Icon name={item.icon} size={17} className={active ? "text-accent" : ""} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}