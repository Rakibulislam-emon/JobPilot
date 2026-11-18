import { AddJobTrigger } from "@/components/AddJobModal";
import { Board } from "@/components/Board";
import { buttonVariants } from "@/components/ui/button";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(400);

  const jobs = (data ?? []) as Job[];
  const activeCount = jobs.filter((job) => ["saved", "applied", "oa", "interview"].includes(job.status)).length;

  return (
    <div className="animate-in min-w-0">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display text-[26px] text-fg">Board</h1>
          <p className="mt-1 text-[12px] text-muted">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} · {activeCount} active
            <span className="ml-2 hidden text-muted-2 sm:inline">· drag a card to move</span>
          </p>
        </div>
        <AddJobTrigger className={buttonVariants({ variant: "default", size: "sm" })}>
          Add job
        </AddJobTrigger>
      </header>

      {error ? (
        <div role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-[12.5px] text-danger">
          Could not load the board. Please refresh and try again.
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center border-y border-line px-6 py-14 text-center">
          <p className="text-[13px] font-medium text-fg">Nothing on the board yet</p>
          <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted">
            Every job you add shows up here as a card. Move it between stages as you progress.
          </p>
          <AddJobTrigger className={`${buttonVariants({ variant: "default", size: "sm" })} mt-4`}>
            Add your first job
          </AddJobTrigger>
        </div>
      ) : (
        <Board jobs={jobs} />
      )}
    </div>
  );
}
