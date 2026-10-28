import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-in">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft ring-1 ring-accent/30">
            <span className="h-3 w-3 rounded-full bg-accent shadow-[0_0_16px_3px_rgba(20,184,166,.55)]" />
          </div>
          <div>
            <h1 className="display text-[22px] font-normal tracking-tight">
              Job<span className="text-accent">Desk</span>
            </h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
              job application tracker
            </p>
          </div>
        </div>

        {isSupabaseConfigured ? (
          <div className="card p-6">
            <LoginForm />
          </div>
        ) : (
          <div className="card p-6">
            <h2 className="mb-2 text-sm font-semibold text-amber-300">
              Supabase is not configured yet
            </h2>
            <p className="mb-4 text-xs leading-relaxed text-muted">
              Copy <code className="mono text-accent">.env.example</code> to{" "}
              <code className="mono text-accent">.env.local</code> and fill in your
              project URL and anon key. Then restart the dev server.
            </p>
            <ol className="space-y-2 text-xs text-muted">
              <li>
                1. Create a project at{" "}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline decoration-brand/40"
                >
                  supabase.com/dashboard
                </a>
              </li>
              <li>
                2. SQL Editor → paste{" "}
                <code className="mono text-accent">supabase/schema.sql</code> → Run
              </li>
              <li>3. Settings → API → copy URL + anon key</li>
              <li>4. Authentication → Users → add your email &amp; password</li>
            </ol>
            <Link href="/" className="btn btn-ghost mt-5 w-full">
              Re-check configuration
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
