"use client";

import { updateStatus } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import type { Status } from "@/lib/types";
import { cn } from "cn";
import { useState, useTransition } from "react";

export function StatusSwitcher({
  jobId,
  current,
}: {
  jobId: string;
  current: Status;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div
      role="group"
      aria-label="Application status"
      className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface/40 p-1.5"
    >
      {STATUS_ORDER.map((s) => {
        const active = s === current;
        return (
          <Button
            key={s}
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || active}
            aria-pressed={active}
            onClick={() => startTransition(async () => {
              setError("");
              const result = await updateStatus(jobId, s);
              if ("error" in result) setError(result.error);
            })}
            className={cn(
              "relative h-8 w-full justify-start gap-2.5 px-2.5 text-[12px]",
              active
                ? "bg-surface-3 font-medium text-fg before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-accent"
                : "font-normal text-fg-2 hover:bg-surface-2 hover:text-fg"
            )}
          >
            <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_META[s].dot)} />
            <span className="min-w-0 flex-1 truncate text-left">{STATUS_META[s].label}</span>
            {active ? (
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-accent">
                Current
              </span>
            ) : null}
            {pending && !active && (
              <span className="shrink-0 text-[10px] text-muted-2">Saving…</span>
            )}
          </Button>
        );
      })}
      {error && <p role="alert" className="mt-1.5 px-2.5 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
