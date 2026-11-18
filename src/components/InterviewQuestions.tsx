import {
  addInterviewQuestion,
  deleteInterviewQuestion,
  setInterviewQuestionStatus,
} from "@/app/actions";
import { QUESTION_STATUS_META, QUESTION_STATUS_ORDER } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { InterviewQuestion, QuestionStatus } from "@/lib/types";
import { Icon } from "./Icon";
import { QuestionEditDialog } from "./QuestionEditDialog";
import { Section } from "./Shell";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export function QuestionStatusPill({
  status,
  size = "sm",
}: {
  status: QuestionStatus;
  size?: "sm" | "md";
}) {
  const meta = QUESTION_STATUS_META[status] ?? QUESTION_STATUS_META.missed;
  return (
    <span
      className={`pill ${meta.pill} ${size === "md" ? "px-2.5 py-1 text-[11.5px]" : ""}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function InterviewQuestions({
  jobId,
  questions,
  missingTable = false,
}: {
  jobId: string;
  questions: InterviewQuestion[];
  missingTable?: boolean;
}) {
  const toReview = questions.filter((q) => q.status !== "solid").length;

  if (missingTable) {
    return (
      <Section title="Interview questions">
        <div className="px-4 py-4 text-[11.5px] leading-relaxed text-muted">
          One-time setup needed: run{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px] text-fg-2">
            supabase/interview_questions.sql
          </code>{" "}
          in the Supabase SQL Editor, then reload this page.
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Interview questions"
      right={
        <span className="mono text-[11px] text-muted">
          {questions.length === 0
            ? "empty"
            : toReview > 0
              ? `${toReview} to review`
              : `${questions.length} logged`}
        </span>
      }
    >
      <details className="border-b border-line">
        <summary className="cursor-pointer px-4 py-2.5 text-[11.5px] text-muted transition-colors hover:text-fg">
          + Log a question from an interview
        </summary>
        <form action={addInterviewQuestion} className="space-y-2 px-4 pb-4">
          <input type="hidden" name="job_id" value={jobId} />
          <input type="hidden" name="status" value="missed" />
          <Textarea
            name="question"
            required
            rows={2}
            className="resize-y text-[12.5px]"
            placeholder="What did they ask?"
          />
          <Textarea
            name="answer"
            rows={2}
            className="resize-y text-[12.5px]"
            placeholder="Your answer — or the answer you should learn for next time…"
          />
          <p className="text-[10.5px] leading-relaxed text-muted-2">
            New questions go to <span className="text-fg-2">To review</span> on your Prep page.
            Mark how it went and add the round later — from the question itself.
          </p>
          <Button type="submit" size="sm" className="h-9">
            <Icon name="plus" size={14} />
            Save question
          </Button>
        </form>
      </details>

      <ul className="divide-y divide-line">
        {questions.map((q) => {
          const meta = QUESTION_STATUS_META[q.status] ?? QUESTION_STATUS_META.missed;
          return (
            <li key={q.id} className="px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <span className={`pill shrink-0 ${meta.pill}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-fg">
                    {q.question}
                  </p>
                  <div className="mt-1 text-[10.5px] text-muted">
                    {q.round && <span>{q.round} · </span>}
                    {formatDate(q.created_at)}
                  </div>
                  {q.answer && (
                    <p className="mt-2 whitespace-pre-line rounded-md border border-line bg-surface-2/50 px-2.5 py-2 text-[11.5px] leading-relaxed text-muted">
                      {q.answer}
                    </p>
                  )}
                </div>
                <form action={deleteInterviewQuestion}>
                  <input type="hidden" name="id" value={q.id} />
                  <button
                    type="submit"
                    className="text-muted-2 transition-colors hover:text-danger"
                    aria-label="Delete question"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </form>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <form action={setInterviewQuestionStatus} className="flex flex-wrap items-center gap-1">
                  <input type="hidden" name="id" value={q.id} />
                  <span className="mr-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-2">
                    Mark
                  </span>
                  {QUESTION_STATUS_ORDER.filter((status) => status !== q.status).map((status) => (
                    <button
                      key={status}
                      type="submit"
                      name="status"
                      value={status}
                      className="pill border-line-2 bg-transparent text-muted transition-colors hover:border-line-3 hover:text-fg"
                    >
                      {QUESTION_STATUS_META[status].short}
                    </button>
                  ))}
                </form>

                <div className="ml-auto">
                  <QuestionEditDialog question={q} />
                </div>
              </div>
            </li>
          );
        })}
        {questions.length === 0 && (
          <li className="px-4 py-4 text-center text-[11.5px] leading-relaxed text-muted">
            After an interview, write down what they asked and what you missed.
            <br />
            Those questions show up on your Prep page for next time.
          </li>
        )}
      </ul>
    </Section>
  );
}
