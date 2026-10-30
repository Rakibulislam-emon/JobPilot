"use client";

import { updateStatus } from "@/app/actions";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { daysUntil, formatDate } from "@/lib/format";
import type { Job, Status } from "@/lib/types";
import Link from "next/link";
import { useState, useTransition } from "react";

export function Board({ jobs }: { jobs: Job[] }) {
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [hover, setHover] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const statusOf = (job: Job): Status => overrides[job.id] ?? job.status;

  function drop(status: Status, jobId: string) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) return;
    const previousStatus = statusOf(job);
    if (previousStatus === status) return;
    setError("");
    setOverrides((prev) => ({ ...prev, [jobId]: status }));
    setDragging(null);
    setHover(null);
    startTransition(async () => {
      const result = await updateStatus(jobId, status);
      if ("error" in result) {
        setOverrides((prev) => {
          const next = { ...prev };
          if (previousStatus === job.status) delete next[jobId];
          else next[jobId] = previousStatus;
          return next;
        });
        setError(result.error || "Could not update this job. Try again.");
      }
    });
  }

  return (
    <div>
      {error && (
        <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-[12px] text-danger">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error" className="text-danger/80 hover:text-danger">×</button>
        </div>
      )}
      <div className="board-scroll -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
      {STATUS_ORDER.map((status) => {
        const items = jobs.filter((j) => statusOf(j) === status);
        const meta = STATUS_META[status];
        const isHover = hover === status;
        const ratio = jobs.length ? Math.round((items.length / jobs.length) * 100) : 0;

        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setHover(status);
            }}
            onDragLeave={() => setHover((h) => (h === status ? null : h))}
            onDrop={(e) => {
              e.preventDefault();
              const jobId = e.dataTransfer.getData("text/plain");
              if (jobId) drop(status, jobId);
            }}
            className={`flex w-[min(84vw,300px)] shrink-0 snap-start flex-col rounded-xl border transition-colors sm:w-72.5 ${
              isHover
                ? "border-accent/50 bg-accent-soft/30 shadow-glow"
                : "border-line bg-surface/70"
            }`}
          >
            <div className="border-b border-line px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                  <span className="truncate text-[12px] font-semibold text-fg">{meta.short}</span>
                </div>
                <span className="mono grid h-6 min-w-6 place-items-center rounded-md border border-line-2 bg-surface-2 px-1 text-[10px] text-muted">{items.length}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                <div className={`h-full rounded-full ${meta.bar} transition-[width]`} style={{ width: `${ratio}%` }} />
              </div>
            </div>

            <div className="flex min-h-30 flex-1 flex-col gap-2 p-2">
              {items.map((job) => {
                const d = daysUntil(job.deadline);
                const urgent = job.deadline && d !== null && d >= 0 && d <= 3;
                const overdue = job.deadline && d !== null && d < 0;

                return (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", job.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragging(job.id);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setHover(null);
                    }}
                    className={`group cursor-grab rounded-lg border border-line bg-surface p-3 transition-all active:cursor-grabbing ${
                      dragging === job.id
                        ? "opacity-40"
                        : "hover:-translate-y-0.5 hover:border-line-3 hover:bg-surface-2"
                    }`}
                  >
                    <Link href={`/jobs/${job.id}`} draggable={false} className="block min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold leading-snug text-fg">{job.company || "Company not set"}</div>
                          <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{job.title || "Role not set"}</div>
                        </div>
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-[9px] font-medium text-muted-2">
                          {initials(job.company || job.title)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {job.priority <= 2 && <span className="rounded border border-line-2 px-1.5 py-0.5 text-[9px] text-fg-2">{job.priority === 1 ? "priority" : "high"}</span>}
                        {job.deadline && <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${overdue ? "border-danger/25 text-danger" : urgent ? "border-warn/25 text-warn" : "border-line text-muted-2"}`}>{formatDate(job.deadline)}</span>}
                        {job.source && <span className="rounded border border-line px-1.5 py-0.5 text-[9px] capitalize text-muted-2">{job.source}</span>}
                      </div>
                    </Link>
                    <label className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2 md:hidden">
                      <span className="text-[10px] text-muted">Move to</span>
                      <select
                        aria-label={`Move ${job.company || job.title || "job"} to stage`}
                        value={statusOf(job)}
                        onChange={(event) => drop(event.target.value as Status, job.id)}
                        className="input h-8 w-auto min-w-0 py-0 text-[10px]"
                      >
                        {STATUS_ORDER.map((option) => <option key={option} value={option}>{STATUS_META[option].short}</option>)}
                      </select>
                    </label>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line py-8 text-[11px] text-muted-2">
                  drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div aria-hidden className="w-px shrink-0" />
      </div>
    </div>
  );
}

function initials(value: string): string {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}
