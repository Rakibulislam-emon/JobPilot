import { STATUS_META } from "@/lib/constants";
import type { Status } from "@/lib/types";

export function StatusPill({
  status,
  size = "sm",
}: {
  status: Status;
  size?: "sm" | "md";
}) {
  const meta = STATUS_META[status] ?? STATUS_META.saved;
  return (
    <span
      className={`pill ${meta.pill} ${
        size === "md" ? "px-2.5 py-1 text-[11.5px]" : ""
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
