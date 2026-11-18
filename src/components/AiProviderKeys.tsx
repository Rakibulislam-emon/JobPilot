"use client";

import { deleteProviderKey, saveProviderKey, type ProviderKeyActionState } from "@/app/(app)/settings/actions";
import type { AiProviderId } from "@/lib/aiKeyVault";
import { useActionState } from "react";

const PROVIDERS: { id: AiProviderId; name: string; url: string; placeholder: string }[] = [
  { id: "gemini", name: "Google Gemini", url: "https://aistudio.google.com/apikey", placeholder: "AIza…" },
  { id: "openrouter", name: "OpenRouter", url: "https://openrouter.ai/keys", placeholder: "sk-or-v1-…" },
  { id: "groq", name: "Groq", url: "https://console.groq.com/keys", placeholder: "gsk_…" },
];

const INITIAL: ProviderKeyActionState = {};

export function AiProviderKeys({ configured, saved }: { configured: AiProviderId[]; saved: AiProviderId[] }) {
  return (
    <div className="space-y-3 p-4">
      <p className="text-[12px] leading-relaxed text-muted">
        Add one or more API keys. Keys are encrypted before storage and never shown again. Local extraction runs first; providers are fallback when AI is needed.
      </p>
      {PROVIDERS.map((provider) => (
        <ProviderKeyCard
          key={provider.id}
          provider={provider}
          configured={configured.includes(provider.id)}
          saved={saved.includes(provider.id)}
        />
      ))}
    </div>
  );
}

function ProviderKeyCard({
  provider,
  configured,
  saved,
}: {
  provider: (typeof PROVIDERS)[number];
  configured: boolean;
  saved: boolean;
}) {
  const [saveState, saveAction, saving] = useActionState(saveProviderKey, INITIAL);
  const [deleteState, deleteAction, deleting] = useActionState(deleteProviderKey, INITIAL);
  const status = saveState.message ? saveState : deleteState;

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[12px] font-medium text-fg">{provider.name}</div>
        <span className={`text-[10px] ${configured ? "text-success" : "text-muted"}`}>
          {configured ? "key configured" : "not configured"}
        </span>
      </div>
      <form action={saveAction} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="provider" value={provider.id} />
        <input
          type="password"
          name="apiKey"
          autoComplete="new-password"
          minLength={20}
          maxLength={500}
          required
          placeholder={provider.placeholder}
          aria-label={`${provider.name} API key`}
          className="input min-w-0 flex-1"
        />
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? "Saving…" : "Save key"}
        </button>
      </form>
      <div className="mt-2 flex items-center justify-between gap-2">
        <a href={provider.url} target="_blank" rel="noreferrer" className="text-[11px] text-muted underline underline-offset-2 hover:text-fg">
          Get API key
        </a>
        {saved && (
          <form action={deleteAction}>
            <input type="hidden" name="provider" value={provider.id} />
            <button type="submit" disabled={deleting} className="text-[11px] text-danger hover:text-danger/80">
              {deleting ? "Removing…" : "Remove saved key"}
            </button>
          </form>
        )}
      </div>
      {status?.message && (
        <p aria-live="polite" className={`mt-2 text-[11px] ${status.ok ? "text-success" : "text-danger"}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
