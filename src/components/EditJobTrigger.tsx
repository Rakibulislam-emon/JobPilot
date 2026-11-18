"use client";

import type { Job } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { useAddJob } from "./AddJobModal";

export function EditJobTrigger({ job }: { job: Job }) {
  const { open } = useAddJob();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => open(job)}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      Edit
    </button>
  );
}
