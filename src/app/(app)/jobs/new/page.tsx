import { JobForm } from "@/components/JobForm";
import { PageHeader } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default function NewJobPage() {
  return (
    <div className="animate-in">
      <PageHeader
        title="Add a job"
        subtitle="Type it manually, or drop a screenshot and let the parser fill it in."
      />
      <div className="max-w-3xl">
        <JobForm />
      </div>
    </div>
  );
}
