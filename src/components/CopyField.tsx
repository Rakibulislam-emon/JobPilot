"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <code className="mono flex-1 truncate rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[11.5px] text-accent/90">
        {value || "not set"}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            /* ignore */
          }
        }}
        className="btn btn-ghost shrink-0"
      >
        <Icon name={copied ? "check" : "copy"} size={13} />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
