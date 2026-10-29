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
    <div className="board-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8">
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
            className={`flex w-[272px] shrink-0 flex-col rounded-xl border transition-colors ${
              isHover
                ? "border-line-3 bg-surface-2/60"
                : "border-line bg-surface/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                <span className="text-[12px] font-medium text-fg-2">
                  {meta.short}
                </span>
              </div>
              <span className="mono text-[11px] text-muted-2">{items.length}</span>
            </div>

            <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
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
                    className={`group cursor-grab rounded-lg border border-line bg-surface-2 p-2.5 transition-colors active:cursor-grabbing ${
                      dragging === job.id
                        ? "opacity-40"
                        : "hover:border-line-2 hover:bg-surface-3"
                    }`}
                  >
                    <Link href={`/jobs/${job.id}`} draggable={false} className="block">
                      <div className="line-clamp-2 text-[12.5px] font-medium leading-snug text-fg">
                        {job.title || "(untitled role)"}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted">
                        {job.company || "Unknown"}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {job.priority <= 2 && (
                          <span className="pill border-line-2 bg-transparent px-1.5 py-0 text-[9.5px] text-fg-2">
                            {job.priority === 1 ? "dream" : "high"}
                          </span>
                        )}
                        {job.deadline && (
                          <span
                            className={`mono text-[9.5px] ${
                              overdue
                                ? "text-danger"
                                : urgent
                                  ? "text-warn"
                                  : "text-muted-2"
                            }`}
                          >
                            {formatDate(job.deadline)}
                          </span>
                        )}
                        {job.source && (
                          <span className="text-[9.5px] capitalize text-muted-2">
                            {job.source}
                          </span>
                        )}
                      </div>
                    </Link>
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
  );
}
