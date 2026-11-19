"use client";

import { addNote, deleteTimelineNote } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

type ActionState = { ok: true } | { error: string } | null;

export function AddTimelineNote({ jobId }: { jobId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionState, formData: FormData) => {
      const result = await addNote(formData);
      if ("ok" in result) formRef.current?.reset();
      return result;
    },
    null
  );

  useEffect(() => {
    if (state && "ok" in state) router.refresh();
  }, [router, state]);

  return (
    <form ref={formRef} action={formAction} className="mb-5 flex flex-wrap gap-2">
      <input type="hidden" name="job_id" value={jobId} />
      <Input
        name="note"
        placeholder="Add a note — recruiter called, interview scheduled…"
        aria-label="Add a timeline note"
        required
        maxLength={2000}
        disabled={pending}
        className="h-9 min-w-0 flex-1 text-[12.5px]"
      />
      <Button type="submit" size="sm" disabled={pending} className="h-9 shrink-0">
        <Icon name="plus" size={13} />
        <span className="hidden sm:inline">{pending ? "Adding…" : "Add note"}</span>
      </Button>
      {state && "error" in state && (
        <p role="alert" className="basis-full text-[11px] text-danger">
          {state.error}
        </p>
      )}
      {state && "ok" in state && (
        <p role="status" className="basis-full text-[11px] text-muted">
          Note added.
        </p>
      )}
    </form>
  );
}
export function DeleteTimelineNote({
  jobId,
  activityId,
}: {
  jobId: string;
  activityId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionState, formData: FormData) =>
      deleteTimelineNote(formData),
    null
  );

  useEffect(() => {
    if (state && "ok" in state) router.refresh();
  }, [router, state]);

  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="activity_id" value={activityId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-xs"
        aria-label="Delete note"
        title="Delete note"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm("Delete this timeline note? This cannot be undone.")) {
            event.preventDefault();
          }
        }}
        className="text-muted hover:text-danger"
      >
        <Icon name="trash" size={13} />
      </Button>
      {state && "error" in state && (
        <p role="alert" className="mt-1 text-right text-[10px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
