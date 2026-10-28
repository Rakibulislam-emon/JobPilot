"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateStatus } from "@/app/actions";
import { BOARD_COLUMNS, STATUS_META } from "@/lib/constants";
import { daysUntil, formatDate } from "@/lib/format";
import type { Job, Status } from "@/lib/types";

export function Board({ jobs }: { jobs: Job[] }) {
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [hover, setHover] = useState<Status | null>(null);
  const [, startTransition] = useTransition();

  const statusOf = (job: Job): Status => overrides[job.id] ?? job.status;

  function drop(status: Status, jobId: string) {
    setOverrides((prev) => ({ ...prev, [jobId]: status }));
    setDragging(null);
    setHover(null);
    startTransition(() => {
      void updateStatus(jobId, status);
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {BOARD_COLUMNS.map((status) => {
        const items = jobs.filter((j) => statusOf(j) === status);
        const meta = STATUS_META[status];
        const isHover = hover === status;

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
            className={`flex w-[268px] shrink-0 flex-col rounded-xl border transition ${
              isHover
                ? "border-brand/50 bg-brand/[0.06]"
                : "border-line/80 bg-panel/40"
            }`}
          >
            <div className="flex items-center justify-between border-b border-line/60 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                  {meta.short}
                </span>
              </div>
              <span className="mono rounded bg-ink2 px-1.5 py-0.5 text-[10.5px] text-muted">
                {items.length}
              </span>
            </div>

            <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
              {items.map((job) => {
                const d = daysUntil(job.deadline);
                const urgent =
                  job.deadline && d !== null && d >= 0 && d <= 3;
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
                    className={`group cursor-grab rounded-lg border border-line bg-ink2/80 p-2.5 transition active:cursor-grabbing ${
                      dragging === job.id ? "opacity-40" : "hover:border-line2"
                    }`}
                  >
                    <Link
                      href={`/jobs/${job.id}`}
                      draggable={false}
                      className="block"
                    >
                      <div className="line-clamp-2 text-[12.5px] font-medium leading-snug">
                        {job.title || "(untitled role)"}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted">
                        {job.company || "Unknown"}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {job.priority <= 2 && (
                          <span className="pill border-brand/25 bg-brand/10 px-1.5 py-0 text-[9px] text-brand">
                            {job.priority === 1 ? "dream" : "high"}
                          </span>
                        )}
                        {job.deadline && (
                          <span
                            className={`mono text-[9.5px] ${
                              overdue
                                ? "text-rose-300"
                                : urgent
                                  ? "text-amber-300"
                                  : "text-muted/70"
                            }`}
                          >
                            {formatDate(job.deadline)}
                          </span>
                        )}
                        {job.source && (
                          <span className="text-[9.5px] capitalize text-muted/60">
                            {job.source}
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line/70 py-6 text-[11px] text-muted/50">
                  drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
