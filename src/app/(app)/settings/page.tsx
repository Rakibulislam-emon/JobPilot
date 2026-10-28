import Link from "next/link";
import { CopyField } from "@/components/CopyField";
import { Icon } from "@/components/Icon";
import { PageHeader, Section } from "@/components/Shell";
import { requireUser } from "@/lib/supabase/server";
import {
  APP_URL,
  EXTENSION_TOKEN,
  GEMINI_API_KEY,
  GROQ_API_KEY,
  OPENROUTER_API_KEY,
  SUPABASE_SERVICE_KEY,
  isSupabaseConfigured,
} from "@/lib/env";
import { aiStatus } from "@/lib/extract";
import { BOARD_COLUMNS, STATUS_META } from "@/lib/constants";

export const dynamic = "force-dynamic";

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`}
      />
      <span className="text-muted">{label}</span>
      <span className={`ml-auto ${ok ? "text-emerald-300" : "text-amber-300"}`}>
        {ok ? "ready" : "missing"}
      </span>
    </div>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const tokenIsSet =
    Boolean(EXTENSION_TOKEN) && EXTENSION_TOKEN !== "change-me-to-a-long-random-string";

  const ai = aiStatus();
  const providers = [
    { id: "gemini", label: "Google Gemini", key: GEMINI_API_KEY },
    { id: "openrouter", label: "OpenRouter", key: OPENROUTER_API_KEY },
    { id: "groq", label: "Groq", key: GROQ_API_KEY },
  ];

  return (
    <div className="animate-in">
      <PageHeader title="Settings" subtitle={user.email ?? ""} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Extension">
          <div className="space-y-4 p-4">
            <div>
              <div className="label">API endpoint</div>
              <CopyField value={`${APP_URL}/api/save`} />
            </div>
            <div>
              <div className="label">Extension token</div>
              {tokenIsSet ? (
                <CopyField value={EXTENSION_TOKEN} />
              ) : (
                <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-2 text-[11.5px] text-amber-300">
                  Set <code className="mono">EXTENSION_TOKEN</code> in{" "}
                  <code className="mono">.env.local</code> to a long random string,
                  restart the server, then reload this page.
                </p>
              )}
            </div>

            <ol className="space-y-2 text-[12px] leading-relaxed text-muted">
              <li>
                <span className="text-fg">1.</span> Open{" "}
                <code className="mono text-accent">chrome://extensions</code> and
                enable Developer mode.
              </li>
              <li>
                <span className="text-fg">2.</span> Click{" "}
                <span className="text-fg">Load unpacked</span> and pick the{" "}
                <code className="mono text-accent">extension</code> folder in this
                project.
              </li>
              <li>
                <span className="text-fg">3.</span> Open the extension options and
                paste the endpoint + token above.
              </li>
              <li>
                <span className="text-fg">4.</span> On any job post press{" "}
                <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px]">
                  Alt+Shift+J
                </kbd>{" "}
                or click the toolbar icon.
              </li>
            </ol>
          </div>
        </Section>

        <div className="space-y-4">
          <Section title="System checks">
            <div className="space-y-2.5 p-4">
              <Status ok={isSupabaseConfigured} label="Supabase connection" />
              <Status ok={SUPABASE_SERVICE_KEY.length > 20} label="Service role key (screenshots)" />
              <Status ok={tokenIsSet} label="Extension token" />
              <div className="my-1 h-px bg-line/60" />
              {providers.map((p) => {
                const configured = p.key.length > 10;
                const active = ai.primary === p.id;
                return (
                  <div key={p.id} className="flex items-center gap-2 text-[12px]">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active
                          ? "bg-emerald-400"
                          : configured
                            ? "bg-sky-400"
                            : "bg-line2"
                      }`}
                    />
                    <span className="text-muted">{p.label}</span>
                    <span
                      className={`ml-auto ${
                        active
                          ? "text-emerald-300"
                          : configured
                            ? "text-sky-300"
                            : "text-muted/60"
                      }`}
                    >
                      {active ? "active" : configured ? "standby" : "not set"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-line/60 px-4 py-2.5 text-[11px] leading-relaxed text-muted">
              {ai.primary === "offline"
                ? "No AI provider — the offline regex parser is used. Add any free key (Gemini, OpenRouter or Groq) for much better extraction."
                : `AI parsing is on (${ai.primary}). Providers are tried in order; the offline parser is the last resort.`}
            </div>
          </Section>

          <Section title="Pipeline stages">
            <div className="flex flex-wrap gap-2 p-4">
              {BOARD_COLUMNS.map((s) => (
                <span key={s} className={`pill ${STATUS_META[s].pill}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot}`} />
                  {STATUS_META[s].label}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Account">
            <div className="space-y-3 p-4">
              <div className="text-[12px] text-muted">
                Signed in as <span className="text-fg">{user.email}</span>
              </div>
              <form action="/auth/signout" method="post">
                <button type="submit" className="btn btn-ghost w-full">
                  <Icon name="logout" size={14} />
                  Sign out
                </button>
              </form>
              <Link href="/api/health" target="_blank" className="btn btn-ghost w-full">
                <Icon name="external" size={13} />
                View config health
              </Link>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
