"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BrandMark, BrandName } from "./Brand";
import { Icon } from "./Icon";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV = [
  { href: "/", label: "Dashboard", icon: "grid" as const },
  { href: "/jobs", label: "Jobs", icon: "briefcase" as const },
  { href: "/board", label: "Board", icon: "columns" as const },
  { href: "/prep", label: "Prep", icon: "note" as const },
  { href: "/settings", label: "Settings", icon: "settings" as const },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/jobs") return pathname === "/jobs" || pathname.startsWith("/jobs/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  email: string;
}

export function Sidebar({ email }: SidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  // Close the mobile sheet whenever the route changes
  // (covers back/forward and programmatic navigation).
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <>
      {/* Persistent mobile app bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg px-4 md:hidden">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="JobDesk dashboard"
        >
          <BrandMark className="size-8" />
          <BrandName className="truncate text-[14px]" />
        </Link>
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Open menu"
          aria-controls="app-sidebar"
        >
          <Icon name="menu" size={20} />
        </button>
      </div>

      <SidebarPrimitive id="app-sidebar" aria-label="Primary" collapsible="icon">
        {/* Brand */}
        <SidebarHeader className="gap-0 border-b border-sidebar-border px-2 py-3">
          <Link
            href="/"
            onClick={() => setOpenMobile(false)}
            aria-label="JobDesk dashboard"
            className="group/brand flex min-w-0 items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <BrandMark className="size-8" />
            <span className="min-w-0 leading-tight group-data-[collapsible=icon]/brand:hidden">
              <BrandName className="block truncate text-[13.5px]" />
              <span className="mt-0.5 block truncate text-[9px] font-medium uppercase tracking-[0.13em] text-muted-2">
                Application tracker
              </span>
            </span>
          </Link>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="gap-0">
          <SidebarGroup className="px-2 py-3">
            <SidebarGroupLabel className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-2">
              Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {NAV.map((item) => {
                  const active = isActive(item.href, pathname);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                        isActive={active}
                        tooltip={item.label}
                        aria-current={active ? "page" : undefined}
                        className="relative min-h-10 gap-3 rounded-lg px-2.5 text-[12.5px] data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:before:absolute data-[active=true]:before:inset-y-2 data-[active=true]:before:left-0 data-[active=true]:before:w-0.5 data-[active=true]:before:rounded-full data-[active=true]:before:bg-accent"
                      >
                        <Icon
                          name={item.icon}
                          size={15}
                          className={active ? "text-fg" : "text-muted-2"}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Account */}
        <SidebarFooter className="gap-0 border-t border-sidebar-border p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mb-1 flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2.5 group-data-[collapsible=icon]:hidden">
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
            <SidebarMenuButton
              type="submit"
              tooltip="Sign out"
              className="w-full gap-2.5 text-[12.5px] text-muted hover:text-fg"
            >
              <Icon name="logout" size={14} />
              <span>Sign out</span>
            </SidebarMenuButton>
          </form>
        </SidebarFooter>

        <SidebarRail />
      </SidebarPrimitive>

      {/* Primary mobile navigation keeps page switching one tap away */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-black pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpenMobile(false)}
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
