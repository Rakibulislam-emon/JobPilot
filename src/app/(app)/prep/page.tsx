import Link from "next/link";
import {
  deleteInterviewQuestion,
  setInterviewQuestionStatus,
} from "@/app/actions";
import { Icon } from "@/components/Icon";
import { QuestionStatusPill } from "@/components/InterviewQuestions";
import { PageHeader, Section } from "@/components/Shell";
import { QUESTION_STATUS_META, QUESTION_STATUS_ORDER } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createClient, requireUser } from "@/lib/supabase/server";
import { QUESTION_COLUMNS } from "@/lib/queries";
import type { InterviewQuestion, Job, QuestionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Filter = "all" | "review" | QuestionStatus;

const FILTERS: Filter[] = ["review", "all", "missed", "shaky", "solid"];

const JOB_FIELDS = "id, company, title, status";

function pickFilter(raw: string | string[] | undefined): Filter {
  const value = Array.isArray(raw) ? raw[raw.length - 1] ?? "" : raw ?? "";
  return (FILTERS as string[]).includes(value) ? (value as Filter) : "review";
}

function matches(q: InterviewQuestion, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "review") return q.status !== "solid";
  return q.status === filter;
}

function filterLabel(filter: Filter, count: number): string {
  if (filter === "all") return `All (${count})`;
  if (filter === "review") return `To review (${count})`;
  return `${QUESTION_STATUS_META[filter].short} (${count})`;
}

export default async function PrepPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const filter = pickFilter(sp.filter);

  const [questionsResult, jobsResult] = await Promise.all([
    supabase
      .from("interview_questions")
      .select(QUESTION_COLUMNS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("jobs").select(JOB_FIELDS).eq("user_id", user.id),
  ]);

  if (questionsResult.error?.code === "PGRST205") {
    return (
      <div className="animate-in">
        <PageHeader
          eyebrow="PREP"
          title="Question bank"
          subtitle="Every question you were asked, so a failed interview becomes next time's answer."
        />
        <div className="rounded-xl border border-warn/25 bg-warn-soft px-4 py-4 text-[12.5px] leading-relaxed text-warn">
          <p className="font-medium">One-time setup needed</p>
          <p className="mt-1 text-warn/90">
            Run{" "}
            <code className="rounded bg-black/20 px-1 py-0.5 text-[11.5px]">
              supabase/interview_questions.sql
            </code>{" "}
            in the Supabase SQL Editor, then reload this page.
          </p>
        </div>
      </div>
    );
  }

  const questions = (questionsResult.data ?? []) as InterviewQuestion[];
  const jobs = (jobsResult.data ?? []) as Pick<Job, "id" | "company" | "title" | "status">[];
  const jobById = new Map(jobs.map((job) => [job.id, job]));

  const count = (f: Filter) => questions.filter((q) => matches(q, f)).length;

  // Missed first, then shaky, then solid; newest first inside each group.
  const rank: Record<QuestionStatus, number> = { missed: 0, shaky: 1, solid: 2 };
  const visible = questions
    .filter((q) => matches(q, filter))
    .sort(
      (a, b) =>
        rank[a.status] - rank[b.status] ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const reviewCount = count("review");

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="PREP"
        title="Question bank"
        subtitle="Every question you were asked, so a failed interview becomes next time's answer."
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <Link
              key={f}
              href={f === "review" ? "/prep" : `/prep?filter=${f}`}
              aria-current={active ? "page" : undefined}
              className={`pill transition-colors ${
                active
                  ? "border-line-3 bg-surface-2 text-fg"
                  : "border-line bg-transparent text-muted hover:border-line-2 hover:text-fg"
              }`}
            >
              {filterLabel(f, count(f))}
            </Link>
          );
        })}
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-2 px-6 py-16 text-center">
          <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-line-2 bg-surface-2">
            <Icon name="note" size={17} className="text-muted" />
          </div>
          <h3 className="text-[14px] font-medium tracking-tight text-fg">
            No questions logged yet
          </h3>
          <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">
            Open a job and use <span className="text-fg-2">Interview questions</span> to write
            down what they asked and how it went. Anything you missed shows up here.
          </p>
          <Link href="/jobs" className="btn btn-primary mt-5">
            Go to jobs
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-2 px-6 py-14 text-center">
          <p className="text-sm font-medium">Nothing in this filter</p>
          <p className="mt-1 text-xs text-muted">
            {filter === "review"
              ? "You have answered everything well. Nice."
              : "Log a question on a job page to fill this up."}
          </p>
        </div>
      ) : (
        <Section
          title={filter === "all" ? "All questions" : filter === "review" ? "To review" : QUESTION_STATUS_META[filter].label}
          right={
            <span className="mono text-[11px] text-muted">
              {visible.length} question{visible.length === 1 ? "" : "s"}
            </span>
          }
        >
          <ul className="divide-y divide-line">
            {visible.map((q) => {
              const job = jobById.get(q.job_id);
              return (
                <li key={q.id} className="px-4 py-4">
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 sm:w-[7.5rem]">
                      <QuestionStatusPill status={q.status} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-line text-[13px] leading-relaxed text-fg">
                        {q.question}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted">
                        {q.round && <span>{q.round}</span>}
                        <span>{formatDate(q.created_at)}</span>
                        <span className="text-line-3">·</span>
                        {job ? (
                          <Link
                            href={`/jobs/${job.id}`}
                            className="inline-flex min-w-0 items-center gap-1 text-fg-2 hover:text-fg hover:underline"
                          >
                            <Icon name="briefcase" size={11} className="shrink-0" />
                            <span className="truncate">
                              {job.company || "(no company)"} — {job.title || "role"}
                            </span>
                          </Link>
                        ) : (
                          <span>Job deleted</span>
                        )}
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

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-0 sm:pl-[calc(0.625rem+0.5rem)]">
                    <form
                      action={setInterviewQuestionStatus}
                      className="flex flex-wrap items-center gap-1"
                    >
                      <input type="hidden" name="id" value={q.id} />
                      <span className="mr-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-2">
                        Mark
                      </span>
                      {QUESTION_STATUS_ORDER.filter((status) => status !== q.status).map(
                        (status) => (
                          <button
                            key={status}
                            type="submit"
                            name="status"
                            value={status}
                            className="pill border-line-2 bg-transparent text-muted transition-colors hover:border-line-3 hover:text-fg"
                          >
                            {QUESTION_STATUS_META[status].short}
                          </button>
                        )
                      )}
                    </form>
                    {job && (
                      <Link
                        href={`/jobs/${job.id}`}
                        className="ml-auto text-[10.5px] text-muted-2 transition-colors hover:text-fg"
                      >
                        Open job →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {questions.length > 0 && reviewCount > 0 && filter !== "review" && (
        <p className="mt-4 text-[11.5px] text-muted">
          {reviewCount} question{reviewCount === 1 ? "" : "s"} still need review.{" "}
          <Link href="/prep" className="text-fg-2 underline-offset-2 hover:text-fg hover:underline">
            Focus on those
          </Link>
          .
        </p>
      )}
    </div>
  );
}
