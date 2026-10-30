import { Board } from "@/components/Board";
import { EmptyState, PageHeader } from "@/components/Shell";
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
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(400);

  const jobs = (data ?? []) as Job[];
  const activeCount = jobs.filter((job) => ["saved", "applied", "oa", "interview"].includes(job.status)).length;
  const inMotionCount = jobs.filter((job) => ["applied", "oa", "interview"].includes(job.status)).length;

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="PIPELINE"
        title="Board"
        subtitle="See every opportunity at a glance and move it forward as things progress."
        action={{ href: "/jobs/new", label: "Add job" }}
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          Could not load the board. Please refresh and try again.
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title="Nothing on the board yet"
          body="Every job you add shows up here as a card. Drag it from Saved → Applied → Interview as you progress."
          cta={{ href: "/jobs/new", label: "Add your first job" }}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="pill border-line-2 bg-transparent text-muted"><span className="mono text-fg">{jobs.length}</span> total</span>
            <span className="pill border-line-2 bg-transparent text-muted"><span className="mono text-fg">{activeCount}</span> active</span>
            <span className="pill border-line-2 bg-transparent text-muted"><span className="mono text-fg">{inMotionCount}</span> in progress</span>
            <span className="ml-auto hidden text-[10px] text-muted sm:inline">Drag cards to move · tap a stage on mobile</span>
          </div>
          <Board jobs={jobs} />
        </>
      )}
    </div>
  );
}
