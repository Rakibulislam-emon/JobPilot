"use client";

import { updateInterviewQuestion } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { InterviewQuestion } from "@/lib/types";
import { useState } from "react";

export function QuestionEditDialog({ question }: { question: InterviewQuestion }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-[10.5px] font-normal text-muted-2 hover:text-fg"
          />
        }
      >
        Edit
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit question</DialogTitle>
          <DialogDescription>
            Refine what was asked and what to learn for next time.
          </DialogDescription>
        </DialogHeader>

        <form
          action={updateInterviewQuestion}
          className="space-y-3"
          onSubmit={() => setOpen(false)}
        >
          <input type="hidden" name="id" value={question.id} />
          <input type="hidden" name="status" value={question.status} />
          <Textarea
            name="question"
            required
            rows={3}
            defaultValue={question.question}
            className="resize-y text-[12.5px]"
          />
          <Textarea
            name="answer"
            rows={4}
            defaultValue={question.answer}
            placeholder="Answer / what to learn"
            className="resize-y text-[12.5px]"
          />

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" size="sm" />}>
              Cancel
            </DialogClose>
            <Button type="submit" size="sm">
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
