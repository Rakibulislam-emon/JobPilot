import { Board } from "@/components/Board";
import { EmptyState, PageHeader } from "@/components/Shell";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(400);

  const jobs = (data ?? []) as Job[];

  return (
    <div className="animate-in">
      <PageHeader
        title="Board"
        subtitle="Drag a card to move it through your pipeline."
        action={{ href: "/jobs/new", label: "Add job" }}
      />

      {jobs.length === 0 ? (
        <EmptyState
          title="Nothing on the board yet"
          body="Every job you add shows up here as a card. Drag it from Saved → Applied → Interview as you progress."
          cta={{ href: "/jobs/new", label: "Add your first job" }}
        />
      ) : (
        <Board jobs={jobs} />
      )}
    </div>
  );
}
