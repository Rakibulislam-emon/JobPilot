import { Badge } from "@/components/ui/badge";
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
    <Badge
      variant="secondary"
      className={`gap-1.5 font-normal text-fg-2 ${
        size === "md" ? "h-6 px-2.5 text-[11.5px]" : "text-[11px]"
      }`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}
