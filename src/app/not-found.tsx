import type { Metadata } from "next";
import { BrandMark, BrandName } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — JobDesk",
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md" aria-label="JobDesk home">
          <BrandMark className="size-8" />
          <BrandName className="text-[15px]" />
        </Link>
        <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-muted-2">
          Error / 404
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-14">
        <section className="animate-in relative w-full max-w-2xl overflow-hidden border border-line bg-surface/60 px-5 py-7 sm:px-9 sm:py-10">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-3 -top-14 select-none font-mono text-[clamp(8rem,26vw,15rem)] font-semibold leading-none tracking-[-0.1em] text-fg/[0.035] opacity-50 sm:opacity-100"
          >
            404
          </span>

          <div className="relative">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
              <span className="mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                Status · 404
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
              <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-muted-2">
                Not found
              </span>
            </div>

            <h1 className="display mt-7 max-w-xl text-[clamp(1.75rem,5vw,2.75rem)] text-fg">
              This page isn’t in your workspace.
            </h1>
            <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-muted">
              The link may be outdated, or the job may have been moved or deleted.
              Your saved applications are still where you left them.
            </p>

            <div className="mono mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-line py-3 text-[10.5px] uppercase tracking-[0.08em] text-muted-2">
              <span className="flex items-center gap-2 text-fg-2">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-danger" />
                Route not found
              </span>
              <span aria-hidden="true" className="h-3 w-px bg-line-2" />
              <span>No changes were made</span>
            </div>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/"
                className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}
              >
                <Icon name="back" size={15} />
                Back to dashboard
              </Link>
              <Link
                href="/jobs"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "w-full sm:w-auto",
                })}
              >
                <Icon name="briefcase" size={15} />
                Browse jobs
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="mono flex items-center justify-between gap-4 border-t border-line px-5 py-3.5 text-[10.5px] uppercase tracking-[0.1em] text-muted-2 sm:px-8">
        <span>404 — Page not found</span>
        <span>JobDesk</span>
      </footer>
    </main>
  );
}
