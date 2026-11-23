"use client";

import {
  createMuseApiToken,
  revokeMuseApiToken,
  type ApiTokenActionState,
} from "@/app/(app)/settings/actions";
import { Icon } from "@/components/Icon";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type MuseApiToken = {
  id: string;
  created_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
};

const INITIAL: ApiTokenActionState = {};

export function MuseApiTokens({
  tokens,
  loadError,
}: {
  tokens: MuseApiToken[];
  loadError: string | null;
}) {
  const [state, createAction, creating] = useActionState(createMuseApiToken, INITIAL);
  const router = useRouter();

  useEffect(() => {
    if (state.token) router.refresh();
  }, [router, state.token]);

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-[12px] leading-relaxed text-muted">
          Create a key for Muse to send jobs directly to this account using{" "}
          <code className="mono text-fg-2">POST /api/save</code>.
        </p>
        <form action={createAction} className="mt-3">
          <button type="submit" disabled={creating} className="btn btn-primary">
            {creating ? "Generating…" : "Generate key for Muse"}
          </button>
        </form>
      </div>

      {state.token && (
        <div className="space-y-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <p className="text-[11.5px] font-medium text-fg">
            Save it now; it won’t be shown again.
          </p>
          <OneTimeToken value={state.token} />
        </div>
      )}

      {state.message && (
        <p role="status" className={`text-[11.5px] ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}

      {loadError ? (
        <p className="rounded-lg border border-warn/25 bg-warn-soft px-3 py-2 text-[11.5px] leading-relaxed text-warn">
          Could not load API keys. Apply <code className="mono">supabase/api_tokens.sql</code>{" "}
          and reload this page. Details: {loadError}
        </p>
      ) : (
        <div className="space-y-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Your keys
          </h3>
          {tokens.length === 0 ? (
            <p className="text-[11.5px] text-muted">No Muse API keys yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {tokens.map((token) => (
                <TokenRow key={token.id} token={token} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function OneTimeToken({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("Clipboard access failed. Select and copy the key manually.");
    }
  }

  return (
    <div>
      <div className="flex min-w-0 items-center gap-2">
        <code className="mono min-w-0 flex-1 select-all break-all rounded-md border border-line bg-black px-2.5 py-2 text-[11.5px] text-fg-2">
          {value}
        </code>
        <button type="button" onClick={copyToken} className="btn btn-ghost shrink-0">
          <Icon name={copied ? "check" : "copy"} size={13} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {copyError && <p role="alert" className="mt-1 text-[11px] text-danger">{copyError}</p>}
    </div>
  );
}

function TokenRow({ token }: { token: MuseApiToken }) {
  const [state, revokeAction, revoking] = useActionState(revokeMuseApiToken, INITIAL);
  const router = useRouter();
  const revoked = Boolean(token.revoked_at) || state.ok;

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 text-[11.5px]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-fg-2">
            Created {formatDate(token.created_at)}
          </span>
          <span className={revoked ? "text-muted" : "text-success"}>
            {revoked ? "Revoked" : "Active"}
          </span>
        </div>
        <p className="mt-1 text-muted">
          Last used: {formatDate(token.last_used_at)}
        </p>
      </div>
      {!revoked && (
        <form action={revokeAction}>
          <input type="hidden" name="tokenId" value={token.id} />
          <button type="submit" disabled={revoking} className="btn btn-ghost text-danger">
            {revoking ? "Revoking…" : "Revoke"}
          </button>
        </form>
      )}
      {state.message && !state.ok && (
        <p role="alert" className="w-full text-danger">{state.message}</p>
      )}
    </li>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
