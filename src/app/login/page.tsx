import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[360px] animate-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid h-9 w-9 place-items-center rounded-lg border border-line-2 bg-surface-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight text-fg">JobDesk</h1>
          <p className="mt-1 text-[12.5px] text-muted">Job application tracker</p>
        </div>

        {isSupabaseConfigured ? (
          <Card className="[--card-spacing:--spacing(6)]">
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        ) : (
          <Card className="[--card-spacing:--spacing(6)]">
            <CardContent>
              <h2 className="mb-2 text-[13px] font-medium text-warn">
                Supabase is not configured yet
              </h2>
              <p className="mb-4 text-[12px] leading-relaxed text-muted">
                Copy <code className="mono text-fg-2">.env.example</code> to{" "}
                <code className="mono text-fg-2">.env.local</code> and fill in your
                project URL and anon key. Then restart the dev server.
              </p>
              <ol className="space-y-2 text-[12px] text-muted">
                <li>
                  1. Create a project at{" "}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-fg underline decoration-line-3 underline-offset-2 hover:decoration-fg"
                  >
                    supabase.com/dashboard
                  </a>
                </li>
                <li>
                  2. SQL Editor → paste{" "}
                  <code className="mono text-fg-2">supabase/schema.sql</code> → Run
                </li>
                <li>3. Settings → API → copy URL + anon key</li>
                <li>4. Authentication → Users → add your email &amp; password</li>
              </ol>
              <Link href="/" className="btn btn-ghost mt-5 w-full">
                Re-check configuration
              </Link>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-[11.5px] text-muted-2">
          Single-user workspace
        </p>
      </div>
    </div>
  );
}
