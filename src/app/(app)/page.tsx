import { DashboardView } from "@/components/DashboardView";
import { getDashboardSummary } from "@/lib/dashboard";
import { JOB_DASHBOARD_COLUMNS } from "@/lib/queries";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { JobDashboard } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(JOB_DASHBOARD_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const jobs = (data ?? []) as JobDashboard[];

  return (
    <DashboardView
      jobs={jobs}
      email={user.email ?? ""}
      summary={getDashboardSummary(jobs)}
    />
  );
}
