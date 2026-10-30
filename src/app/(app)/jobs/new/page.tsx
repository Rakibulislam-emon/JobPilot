import { JobForm } from "@/components/JobForm";
import { PageHeader } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default function NewJobPage() {
  return (
    <div className="animate-in">
      <PageHeader
        title="Add a job"
        subtitle="Paste a post or add a screenshot. Job links and details are picked up when available; you can also fill them in later."
      />
      <div className="max-w-3xl">
        <JobForm />
      </div>
    </div>
  );
}
