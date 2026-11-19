"use client";

import { saveInterviewDate } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { DeadlinePicker } from "@/components/DeadlinePicker";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

type SaveState = { ok: true } | { error: string } | null;

export function InterviewSchedule({
  jobId,
  interviewDate,
}: {
  jobId: string;
  interviewDate: string | null;
}) {
  const router = useRouter();
  const [date, setDate] = useState(interviewDate ?? "");
  const [state, formAction, pending] = useActionState(
    async (_previous: SaveState, formData: FormData) =>
      saveInterviewDate(jobId, String(formData.get("interview_date") ?? "")),
    null
  );

  useEffect(() => {
    setDate(interviewDate ?? "");
  }, [interviewDate]);

  useEffect(() => {
    if (state && "ok" in state) router.refresh();
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-2.5">
      <DeadlinePicker
        id={`interview-date-${jobId}`}
        name="interview_date"
        value={date}
        onChange={setDate}
        ariaLabel="Choose interview date"
        placeholder="Pick an interview date"
        clearLabel="Clear interview date"
      />
      <p className="text-[10.5px] leading-relaxed text-muted">
        Set the confirmed date. Leave blank if no interview is scheduled.
      </p>
      <Button type="submit" size="sm" variant="outline" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save interview date"}
      </Button>
      {state && "ok" in state && (
        <p role="status" className="text-[11px] text-muted">
          Interview date saved.
        </p>
      )}
      {state && "error" in state && (
        <p role="alert" className="text-[11px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
