import { deleteJob } from "@/app/actions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CopyOriginalPostButton } from "@/components/CopyOriginalPostButton";
import { AddTimelineNote, DeleteTimelineNote } from "@/components/TimelineNoteControls";
import { EditJobTrigger } from "@/components/EditJobTrigger";
import { Icon } from "@/components/Icon";
import { InterviewSchedule } from "@/components/InterviewSchedule";
import { InterviewQuestions } from "@/components/InterviewQuestions";
import { StatusPill } from "@/components/StatusPill";
import { StatusSwitcher } from "@/components/StatusSwitcher";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { STATUS_META } from "@/lib/constants";
import { daysUntil, formatDate, relativeTime } from "@/lib/format";
import { getApplicationHref, getApplicationLinkLabel } from "@/lib/jobUrl";
import {
  ACTIVITY_COLUMNS,
  JOB_DETAIL_COLUMNS,
  QUESTION_COLUMNS,
} from "@/lib/queries";
import { signedScreenshotUrl } from "@/lib/supabase/admin";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { Activity, InterviewQuestion, Job, Status } from "@/lib/types";
import { cn } from "cn";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function DetailBlock({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
          {label}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function DetailFact({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-2">{label}</div>
      <div className="mt-1.5 truncate text-[12.5px] font-medium text-fg">
        {value || <span className="font-normal text-muted-2">Not specified</span>}
      </div>
    </div>
  );
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // All three reads only need the route id, so run them together instead of
  // paying for three sequential Supabase round-trips.
  const [jobResult, activityResult, questionsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(JOB_DETAIL_COLUMNS)
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("activities")
      .select(ACTIVITY_COLUMNS)
      .eq("job_id", id)
      .order("happened_at", { ascending: false })
      .limit(200),
    supabase
      .from("interview_questions")
      .select(QUESTION_COLUMNS)
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!jobResult.data) notFound();
  const job = jobResult.data as Job;

  const activities = (activityResult.data ?? []) as Activity[];
  const questions = (questionsResult.data ?? []) as InterviewQuestion[];
  const questionsMissing = questionsResult.error?.code === "PGRST205";
  const shotUrl = await signedScreenshotUrl(job.screenshot);

  const dleft = daysUntil(job.deadline);

  const deadlineTone =
    dleft !== null && (dleft < 0 || dleft <= 2)
      ? "border-danger/25 bg-danger-soft text-danger"
      : dleft !== null && dleft <= 5
        ? "border-warn/25 bg-warn-soft text-warn"
        : "border-line bg-surface-2 text-muted";

  const href = job.url ? getApplicationHref(job.url) : null;

  const aiMeta = job.ai_meta && typeof job.ai_meta === "object" ? job.ai_meta : {};
  const rawPost = typeof aiMeta.raw_post === "string" ? aiMeta.raw_post : "";
  const applyLink =
    typeof aiMeta.apply_link === "string"
      ? getApplicationHref(aiMeta.apply_link)
      : null;
  const hasOriginal = Boolean(rawPost.trim() || shotUrl);

  return (
    <div className="animate-in min-w-0">
      {/* Header */}
      <header className="mb-6 border-b border-line pb-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-md text-[11.5px] text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Icon name="back" size={13} />
            All jobs
          </Link>
          <div className="flex items-center gap-2">
            {applyLink && (
              <a
                href={applyLink}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "default", size: "sm" })}
              >
                Apply
              </a>
            )}
            {href && (
              <a href={href} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Icon name="external" size={13} />
                <span className="hidden sm:inline">{getApplicationLinkLabel(job.url)}</span>
              </a>
            )}
            <EditJobTrigger job={job} />
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <h1 className="display wrap-break-word text-[28px] leading-tight sm:text-[34px]">
            {job.title || "(untitled role)"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12px] text-muted">
            <span className="font-medium text-fg-2">{job.company || "Unknown company"}</span>
            {job.location && (
              <>
                <span aria-hidden="true" className="text-line-3">·</span>
                <span>{job.location}</span>
              </>
            )}
            <StatusPill status={job.status} />
          </div>
        </div>
      </header>

      {/* Deadline signal */}
      {job.deadline && dleft !== null && (
        <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3.5 py-3", deadlineTone)}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-md border border-current/20 bg-current/10">
              <Icon name="clock" size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] opacity-80">Deadline</p>
              <p className="text-[13px] font-medium">
                {formatDate(job.deadline)}
                <Badge variant="outline" className="ml-2 border-current/25 font-normal text-current">
                  {dleft < 0 ? "Expired" : `${dleft}d left`}
                </Badge>
              </p>
            </div>
          </div>
          <span className="text-[11px] opacity-80">
            {dleft < 0 ? "Deadline passed" : job.status === "saved" ? "Apply before this date" : "Keep the momentum going"}
          </span>
        </div>
      )}

      {/* Facts */}
      <section aria-label="Job details" className="mb-7 grid grid-cols-2 gap-x-5 gap-y-4 border-b border-line pb-5 sm:grid-cols-3 lg:grid-cols-5">
        <DetailFact label="Salary" value={job.salary} />
        <DetailFact label="Employment" value={job.job_type} />
        <DetailFact label="Source" value={job.source} />
        <DetailFact label="Applied" value={job.applied_at ? formatDate(job.applied_at) : "Not yet"} />
      </section>

      {/* Keep the source post visible so it is easy to review and copy. */}
      {hasOriginal && (
        <section className="mb-7 overflow-hidden rounded-lg border border-line bg-surface/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2 text-[12px] text-fg-2">
              <Icon name="note" size={14} className="shrink-0 text-muted" />
              <span>Original post</span>
              <span className="flex items-center gap-1.5">
                {rawPost.trim() && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal text-fg-2">Text</Badge>
                )}
                {shotUrl && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal text-fg-2">Screenshot</Badge>
                )}
              </span>
            </div>
            {rawPost.trim() && <CopyOriginalPostButton text={rawPost} />}
          </div>
          <div className="space-y-4 px-3.5 py-3.5">
            {rawPost.trim() && (
              <pre className="select-text whitespace-pre-wrap break-words rounded-md border border-line bg-bg/60 p-3 font-sans text-[12px] leading-relaxed text-fg/90">
                {rawPost}
              </pre>
            )}
            {shotUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shotUrl} alt="Original job post screenshot" loading="lazy" decoding="async" className="max-h-96 max-w-full rounded-lg border border-line object-contain object-left-top" />
            )}
          </div>
        </section>
      )}

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_260px] xl:gap-9">
        {/* Main column */}
        <div className="min-w-0 space-y-7">
          {job.notes && (
            <DetailBlock label="Private notes">
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-fg/90">{job.notes}</p>
            </DetailBlock>
          )}

          <InterviewQuestions jobId={job.id} questions={questions} missingTable={questionsMissing} />
        </div>

        {/* Rail */}
        <aside className="min-w-0 space-y-6">
          <DetailBlock label="Interview date">
            <InterviewSchedule jobId={job.id} interviewDate={job.interview_date} />
          </DetailBlock>

          <DetailBlock label="Move to status">
            <StatusSwitcher jobId={job.id} current={job.status} />
          </DetailBlock>

          <form action={deleteJob} className="border-t border-line pt-4">
            <input type="hidden" name="id" value={job.id} />
            <ConfirmSubmit
              message="Delete this job and its whole history?"
              className="inline-flex items-center gap-1.5 rounded-md text-[11.5px] text-muted transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
            >
              <Icon name="trash" size={12} />
              Delete job
            </ConfirmSubmit>
          </form>
        </aside>
      </div>

      {/* Timeline */}
      <section className="mt-9 border-t border-line pt-6">
        <DetailBlock
          label="Timeline"
          right={<span className="mono text-[11px] text-muted-2">{activities.length} event{activities.length === 1 ? "" : "s"}</span>}
        >
          <AddTimelineNote jobId={job.id} />

          <ol className="relative before:absolute before:bottom-4 before:left-[5px] before:top-3 before:w-px before:bg-line-2">
            {activities.map((a) => {
              const to = (a.to_status as Status) ?? null;
              return (
                <li key={a.id} className="relative grid grid-cols-[14px_minmax(0,1fr)] gap-x-3 py-2.5 sm:grid-cols-[14px_130px_minmax(0,1fr)] sm:items-center">
                  <span className="relative z-10 mt-1.5 size-[11px] rounded-full border border-line-2 bg-bg sm:mt-0">
                    <span className={cn("block size-full rounded-full", to ? STATUS_META[to]?.dot ?? "bg-muted" : "bg-accent")} />
                  </span>
                  <time dateTime={a.happened_at} className="hidden text-[11px] text-muted sm:col-start-2 sm:block">
                    <span className="font-medium text-fg-2">{formatDate(a.happened_at)}</span>
                    <span className="mt-0.5 block">{relativeTime(a.happened_at)}</span>
                  </time>
                  <div className="col-start-2 min-w-0 text-[12px] text-fg sm:col-start-3">
                    {a.kind === "status" ? (
                      <>
                        <span className="text-muted">{STATUS_META[(a.from_status as Status) ?? "saved"]?.label}</span>
                        <span className="mx-1.5 text-muted-2">→</span>
                        <span className="font-medium">{STATUS_META[(a.to_status as Status) ?? "saved"]?.label}</span>
                      </>
                    ) : a.kind === "note" ? (
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex-1 whitespace-pre-line break-words">{a.note}</span>
                        <DeleteTimelineNote jobId={job.id} activityId={a.id} />
                      </div>
                    ) : a.kind === "created" ? (
                      <>Job added to JobDesk</>
                    ) : (
                      a.note || a.kind
                    )}
                    <span className="mt-0.5 block text-[10px] text-muted-2 sm:hidden">{relativeTime(a.happened_at)}</span>
                  </div>
                </li>
              );
            })}
            {activities.length === 0 && (
              <li className="py-6 text-center text-[11.5px] text-muted">No events yet.</li>
            )}
          </ol>
        </DetailBlock>
      </section>
    </div>
  );
}
