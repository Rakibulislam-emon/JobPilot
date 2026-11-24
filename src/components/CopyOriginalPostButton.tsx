"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function CopyOriginalPostButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  async function copyPost() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError("Could not copy. Select the post text and copy it manually.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={copyPost}
        aria-label="Copy original job post"
        className="btn btn-ghost shrink-0"
      >
        <Icon name={copied ? "check" : "copy"} size={13} />
        {copied ? "Copied" : "Copy post"}
      </button>
      {copyError && (
        <p role="alert" className="max-w-56 text-right text-[10px] text-danger">
          {copyError}
        </p>
      )}
    </div>
  );
}
