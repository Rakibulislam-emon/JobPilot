"use client";

import { useTransition } from "react";
import { updateStatus } from "@/app/actions";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import type { Status } from "@/lib/types";

export function StatusSwitcher({
  jobId,
  current,
}: {
  jobId: string;
  current: Status;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_ORDER.map((s) => {
        const active = s === current;
        return (
          <button
            key={s}
            type="button"
            disabled={pending || active}
            onClick={() => startTransition(() => updateStatus(jobId, s))}
            className={`pill transition-colors ${
              active
                ? `${STATUS_META[s].pill} cursor-default`
                : "border-line bg-transparent text-muted hover:border-line-3 hover:text-fg"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                active ? STATUS_META[s].dot : "bg-current opacity-40"
              }`}
            />
            {STATUS_META[s].short}
          </button>
        );
      })}
    </div>
  );
}
