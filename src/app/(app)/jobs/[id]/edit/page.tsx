import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { JobForm } from "@/components/JobForm";
import { PageHeader } from "@/components/Shell";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!data) notFound();

  return (
    <div className="animate-in">
      <Link
        href={`/jobs/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-fg"
      >
        <Icon name="back" size={14} />
        Back to job
      </Link>
      <PageHeader title="Edit job" subtitle={(data as Job).company || "Untitled"} />
      <div className="max-w-3xl">
        <JobForm job={data as Job} />
      </div>
    </div>
  );
}
