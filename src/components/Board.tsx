"use client";

import { updateStatus } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { daysUntil, formatDate } from "@/lib/format";
import type { JobBoard, Status } from "@/lib/types";
import Link from "next/link";
import { useState, useTransition } from "react";

export function Board({ jobs }: { jobs: JobBoard[] }) {
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [hover, setHover] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const statusOf = (job: JobBoard): Status => overrides[job.id] ?? job.status;

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

  const cardsFor = (status: Status) => jobs.filter((job) => statusOf(job) === status);

  function renderCard(job: JobBoard, options: { drag?: boolean; mobile?: boolean }) {
    return (
      <JobCard
        key={job.id}
        job={job}
        status={statusOf(job)}
        onMove={(status) => drop(status, job.id)}
        dragging={dragging === job.id}
        drag={options.drag}
        mobile={options.mobile}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", job.id);
          e.dataTransfer.effectAllowed = "move";
          setDragging(job.id);
        }}
        onDragEnd={() => {
          setDragging(null);
          setHover(null);
        }}
      />
    );
  }

  return (
    <div>
      {error && (
        <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-[12px] text-danger">
          <span>{error}</span>
          <Button type="button" variant="ghost" size="icon-xs" onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </Button>
        </div>
      )}

      {/* ── Desktop: horizontal kanban ───────────────────────── */}
      <div className="board-scroll -mx-4 hidden snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:-mx-8 md:flex md:px-8">
        {STATUS_ORDER.map((status) => {
          const items = cardsFor(status);
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
              className={`flex w-64 shrink-0 snap-start flex-col rounded-lg border transition-colors ${
                isHover ? "border-accent/40 bg-accent-soft/20" : "border-line bg-surface/40"
              }`}
            >
              <div className="border-b border-line px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`size-1.5 shrink-0 rounded-full ${meta.dot}`} />
                    <span className="truncate text-[11.5px] font-medium text-fg">{meta.short}</span>
                  </div>
                  <Badge variant="secondary" className="mono h-5 min-w-5 justify-center px-1.5 text-[10px]">
                    {items.length}
                  </Badge>
                </div>
                <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-surface-3">
                  <div className={`h-full rounded-full ${meta.bar} transition-[width]`} style={{ width: `${ratio}%` }} />
                </div>
              </div>

              <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
                {items.map((job) => renderCard(job, { drag: true }))}
                {items.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line/70 py-6 text-[10.5px] text-muted-2">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Mobile: one vertical stream grouped by stage ─────── */}
      <div className="space-y-6 md:hidden">
        <p className="text-[11px] text-muted-2">Tap a stage on any card to move it forward.</p>
        {STATUS_ORDER.map((status) => {
          const items = cardsFor(status);
          if (items.length === 0) return null;
          const meta = STATUS_META[status];

          return (
            <section key={status} aria-label={meta.label} className="min-w-0">
              <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`size-1.5 shrink-0 rounded-full ${meta.dot}`} />
                  <h2 className="truncate text-[12px] font-medium text-fg">{meta.label}</h2>
                </div>
                <Badge variant="secondary" className="mono h-5 min-w-5 justify-center px-1.5 text-[10px]">
                  {items.length}
                </Badge>
              </div>
              <div className="mt-2.5 space-y-2">
                {items.map((job) => renderCard(job, { mobile: true }))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function JobCard({
  job,
  status,
  onMove,
  dragging,
  drag,
  mobile,
  onDragStart,
  onDragEnd,
}: {
  job: JobBoard;
  status: Status;
  onMove: (status: Status) => void;
  dragging: boolean;
  drag?: boolean;
  mobile?: boolean;
  onDragStart?: React.DragEventHandler<HTMLDivElement>;
  onDragEnd?: React.DragEventHandler<HTMLDivElement>;
}) {
  const d = daysUntil(job.deadline);
  const urgent = job.deadline && d !== null && d >= 0 && d <= 3;
  const overdue = job.deadline && d !== null && d < 0;

  return (
    <div
      draggable={drag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-lg border border-line bg-surface p-2.5 transition-all ${
        drag ? "cursor-grab active:cursor-grabbing" : ""
      } ${dragging ? "opacity-40" : "hover:border-line-2 hover:bg-surface-2"}`}
    >
      <Link href={`/jobs/${job.id}`} draggable={false} className="block min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[12px] font-medium leading-snug text-fg">
              {job.company || "Company not set"}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">
              {job.title || "Role not set"}
            </div>
          </div>
          <span className="grid size-6 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-[9px] font-medium text-muted-2">
            {initials(job.company || job.title)}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          {job.deadline && (
            <Badge
              variant="outline"
              className={`mono h-4 px-1.5 text-[9px] font-normal ${
                overdue
                  ? "border-danger/25 text-danger"
                  : urgent
                    ? "border-warn/25 text-warn"
                    : "text-muted-2"
              }`}
            >
              {formatDate(job.deadline)}
            </Badge>
          )}
          {job.source && (
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal capitalize text-muted-2">
              {job.source}
            </Badge>
          )}
        </div>
      </Link>

      <div className={`mt-2.5 border-t border-line pt-2 ${mobile ? "" : "md:hidden"}`}>
        <Select value={status} onValueChange={(value) => onMove(value as Status)}>
          <SelectTrigger
            aria-label={`Move ${job.company || job.title || "job"} to stage`}
            className="h-7 w-full text-[10px]"
          >
            <SelectValue>{(value) => STATUS_META[value as Status]?.short ?? "Move to…"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_ORDER.map((option) => (
              <SelectItem key={option} value={option}>
                {STATUS_META[option].short}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function initials(value: string): string {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}
