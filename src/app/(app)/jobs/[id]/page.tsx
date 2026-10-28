import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Section } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { StatusSwitcher } from "@/components/StatusSwitcher";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { addContact, addNote, deleteContact, deleteJob } from "@/app/actions";
import { STATUS_META } from "@/lib/constants";
import { createClient, requireUser } from "@/lib/supabase/server";
import { signedScreenshotUrl } from "@/lib/supabase/admin";
import { daysUntil, formatDate, relativeTime } from "@/lib/format";
import type { Activity, Contact, Job, Status } from "@/lib/types";

export const dynamic = "force-dynamic";

function Meta({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </div>
      <div className="mt-0.5 text-[13px]">
        {value || <span className="text-muted/60">—</span>}
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

  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!data) notFound();
  const job = data as Job;

  const [activityResult, contactsResult] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("job_id", id)
      .order("happened_at", { ascending: false }),
    supabase
      .from("contacts")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const activities = (activityResult.data ?? []) as Activity[];
  const contacts = (contactsResult.data ?? []) as Contact[];
  const shotUrl = await signedScreenshotUrl(job.screenshot);

  const dleft = daysUntil(job.deadline);
  const closed = ["offer", "rejected", "ghosted", "withdrawn"].includes(job.status);

  return (
    <div className="animate-in">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted transition hover:text-fg"
        >
          <Icon name="back" size={14} />
          All jobs
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/jobs/${job.id}/edit`} className="btn btn-ghost">
            Edit
          </Link>
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              <Icon name="external" size={13} />
              Open posting
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="display text-[24px] font-normal tracking-tight text-fg">
                  {job.title || "(untitled role)"}
                </h1>
                <p className="mt-1 text-[13px] text-muted">
                  {job.company || "Unknown company"}
                  {job.location ? ` · ${job.location}` : ""}
                </p>
              </div>
              <StatusPill status={job.status} size="md" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
              <Meta label="Salary" value={job.salary} />
              <Meta label="Type" value={job.job_type} />
              <Meta label="Source" value={job.source} />
              <Meta label="Priority" value={`${job.priority} / 5`} />
              <Meta
                label="Deadline"
                value={
                  job.deadline ? (
                    <span
                      className={
                        !closed && dleft !== null && dleft < 0
                          ? "text-rose-300"
                          : !closed && dleft !== null && dleft <= 3
                            ? "text-amber-300"
                            : ""
                      }
                    >
                      {formatDate(job.deadline)}
                      {!closed && dleft !== null && dleft >= 0 && (
                        <span className="ml-1 text-[11px] text-muted">
                          ({dleft === 0 ? "today" : `${dleft}d left`})
                        </span>
                      )}
                    </span>
                  ) : null
                }
              />
              <Meta label="Applied" value={job.applied_at ? formatDate(job.applied_at) : null} />
              <Meta label="Added" value={formatDate(job.created_at)} />
              <Meta label="Updated" value={relativeTime(job.updated_at)} />
            </div>
          </div>

          {job.description && (
            <Section title="Summary">
              <p className="whitespace-pre-line px-4 py-4 text-[13px] leading-relaxed text-fg/90">
                {job.description}
              </p>
            </Section>
          )}

          {job.notes && (
            <Section title="Private notes">
              <p className="whitespace-pre-line px-4 py-4 text-[13px] leading-relaxed text-fg/90">
                {job.notes}
              </p>
            </Section>
          )}

          {shotUrl && (
            <Section title="Screenshot">
              <div className="p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shotUrl}
                  alt="Job post screenshot"
                  className="w-full rounded-lg border border-line"
                />
              </div>
            </Section>
          )}

          <Section
            title="Timeline"
            right={
              <span className="mono text-[11px] text-muted">
                {activities.length} event{activities.length === 1 ? "" : "s"}
              </span>
            }
          >
            <form action={addNote} className="flex gap-2 border-b border-line p-3">
              <input type="hidden" name="job_id" value={job.id} />
              <input
                name="note"
                placeholder="Add a note — recruiter called, interview scheduled…"
                className="input"
                required
              />
              <button type="submit" className="btn btn-primary shrink-0">
                <Icon name="plus" size={14} />
                Add
              </button>
            </form>

            <ul className="divide-y divide-line/60">
              {activities.map((a) => {
                const to = (a.to_status as Status) ?? null;
                return (
                  <li key={a.id} className="flex gap-3 px-4 py-3">
                    <div className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line bg-surface-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          to ? STATUS_META[to]?.dot ?? "bg-muted" : "bg-accent"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px]">
                        {a.kind === "status" ? (
                          <>
                            Status changed{" "}
                            <span className="text-muted">
                              {STATUS_META[(a.from_status as Status) ?? "saved"]?.label}
                            </span>{" "}
                            →{" "}
                            <span className="font-medium text-fg">
                              {STATUS_META[(a.to_status as Status) ?? "saved"]?.label}
                            </span>
                          </>
                        ) : a.kind === "note" ? (
                          <span className="whitespace-pre-line">{a.note}</span>
                        ) : a.kind === "created" ? (
                          <>Job added to JobDesk</>
                        ) : (
                          a.note || a.kind
                        )}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-muted">
                        {relativeTime(a.happened_at)} · {formatDate(a.happened_at)}
                      </div>
                    </div>
                  </li>
                );
              })}
              {activities.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-muted">
                  No events yet.
                </li>
              )}
            </ul>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Move to">
            <div className="p-3.5">
              <StatusSwitcher jobId={job.id} current={job.status} />
            </div>
          </Section>

          <Section title="Contacts">
            <ul className="divide-y divide-line/60">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-start gap-2 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium">
                      {c.name || "Unnamed contact"}
                    </div>
                    {c.role && (
                      <div className="truncate text-[11px] text-muted">{c.role}</div>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="block truncate text-[11px] text-accent hover:underline"
                      >
                        {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <div className="truncate text-[11px] text-muted">{c.phone}</div>
                    )}
                  </div>
                  <form action={deleteContact}>
                    <input type="hidden" name="contact_id" value={c.id} />
                    <input type="hidden" name="job_id" value={job.id} />
                    <button
                      type="submit"
                      className="text-muted/60 transition hover:text-rose-300"
                      aria-label="Remove contact"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </form>
                </li>
              ))}
              {contacts.length === 0 && (
                <li className="px-4 py-4 text-center text-[11px] text-muted">
                  No contacts yet.
                </li>
              )}
            </ul>

            <details className="border-t border-line">
              <summary className="cursor-pointer px-4 py-2.5 text-[11.5px] text-accent">
                + Add contact
              </summary>
              <form action={addContact} className="space-y-2 px-4 pb-4">
                <input type="hidden" name="job_id" value={job.id} />
                <input name="name" placeholder="Name" className="input" />
                <input name="role" placeholder="Role (HR, team lead…)" className="input" />
                <input name="email" type="email" placeholder="Email" className="input" />
                <input name="phone" placeholder="Phone" className="input" />
                <button type="submit" className="btn btn-ghost w-full">
                  Save contact
                </button>
              </form>
            </details>
          </Section>

          <form action={deleteJob} className="card p-3">
            <input type="hidden" name="id" value={job.id} />
            <ConfirmSubmit
              message="Delete this job and its whole history?"
              className="btn btn-danger w-full"
            >
              <Icon name="trash" size={13} />
              Delete job
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </div>
  );
}
