"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { saveJob } from "@/app/actions";
import { Icon } from "./Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JOB_TYPES, PRIORITY_LABELS, SOURCES, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { formatDateInput } from "@/lib/format";
import { fileToDataUrl, ocrDataUrl } from "@/lib/image";
import type { Job, Status } from "@/lib/types";

type Draft = {
  company: string;
  title: string;
  location: string;
  salary: string;
  job_type: string;
  source: string;
  deadline: string;
  description: string;
  currency?: string;
};

type ScanState = {
  busy: boolean;
  message?: string;
  error?: string;
  engine?: string;
  progress?: number;
};

export function JobForm({ job }: { job?: Job }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [scan, setScan] = useState<ScanState>({ busy: false });

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) => {
      const result = await saveJob(fd);
      return (result as { error?: string } | undefined) ?? null;
    },
    null
  );

  function setField(name: string, value: string, overwrite = false) {
    if (!value) return;
    const form = formRef.current;
    if (!form) return;
    const el = form.elements.namedItem(name);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (!overwrite && el.value.trim()) return;
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function getField(name: string): string {
    const form = formRef.current;
    if (!form) return "";
    const el = form.elements.namedItem(name);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value;
    return "";
  }

  async function runScan(file: File) {
    setScan({ busy: true, message: "Reading screenshot…" });
    setConfidence({});

    try {
      const dataUrl = await fileToDataUrl(file);

      let res = await postParse({
        image: dataUrl,
        url: getField("url"),
        title: getField("title"),
      });

      // No AI key → a vision-free parse is useless. Fall back to offline OCR.
      if (res.engine === "heuristic" && !res.draft.title) {
        setScan({ busy: true, message: "Running offline OCR…", progress: 0 });
        const text = await ocrDataUrl(dataUrl, (pct) =>
          setScan((s) => ({ ...s, progress: pct }))
        );
        if (text.trim().length > 20) {
          res = await postParse({
            text,
            url: getField("url"),
            title: getField("title"),
          });
        }
      }

      applyDraft(res.draft);
      setConfidence(res.draft.confidence ?? {});

      const low = Object.entries(res.draft.confidence ?? {}).filter(
        ([, v]) => v < 0.5
      ).length;

      setScan({
        busy: false,
        engine: res.engine,
        message:
          res.warning ??
          `Filled from screenshot (${labelForEngine(res.engine)}). ${
            low > 0 ? `${low} field(s) look uncertain — check them.` : "Review before saving."
          }`,
      });
    } catch (err) {
      setScan({
        busy: false,
        error: err instanceof Error ? err.message : "Scan failed.",
      });
    }
  }

  function applyDraft(d: Draft) {
    setField("title", d.title);
    setField("company", d.company);
    setField("location", d.location);
    setField("salary", d.salary);
    setField("deadline", d.deadline);
    setField("description", d.description);
    if (d.job_type) {
      const sel = formRef.current?.elements.namedItem("job_type");
      if (sel instanceof HTMLSelectElement && !sel.value) sel.value = d.job_type;
    }
    if (d.source) {
      const sel = formRef.current?.elements.namedItem("source");
      if (sel instanceof HTMLSelectElement && !sel.value) sel.value = d.source;
    }
  }

  const conf = (name: string) => confidence[name];
  const lowConf = (name: string) => {
    const v = conf(name);
    return typeof v === "number" && v < 0.5;
  };

  function Label({
    htmlFor,
    children,
    field,
    hint,
  }: {
    htmlFor: string;
    children: React.ReactNode;
    field?: string;
    hint?: string;
  }) {
    return (
      <label htmlFor={htmlFor} className="label">
        {children}
        {field && lowConf(field) && (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-amber-300/90">
            · check
          </span>
        )}
        {hint && (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-muted/70">
            {hint}
          </span>
        )}
      </label>
    );
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-4">
        {job?.id && <input type="hidden" name="id" defaultValue={job.id} />}
        {job?.screenshot && (
          <input type="hidden" name="screenshot" defaultValue={job.screenshot} />
        )}

        {/* ── Screenshot scanner ───────────────────────────── */}
        <div className="card p-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft ring-1 ring-accent/25">
              <Icon name="sparkles" size={16} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">Fill from a screenshot</div>
              <div className="text-[11px] text-muted">
                Paste a Facebook / BDJobs post. AI extracts the fields; you confirm.
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={scan.busy}
            >
              <Icon name="camera" size={14} />
              {scan.busy ? "Scanning…" : "Choose image"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              name="screenshot_file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void runScan(file);
              }}
            />
          </div>

          {scan.busy && typeof scan.progress === "number" && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.max(5, scan.progress)}%` }}
                />
              </div>
              <div className="mt-1 text-[10.5px] text-muted">
                OCR {scan.progress}% — first run downloads the language model.
              </div>
            </div>
          )}

          {scan.message && (
            <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-accent/20 bg-accent-soft px-2.5 py-2 text-[11.5px] text-accent/90">
              <Icon name="check" size={13} className="mt-0.5 shrink-0" />
              {scan.message}
            </p>
          )}
          {scan.error && (
            <p className="mt-2.5 rounded-lg border border-danger/25 bg-danger-soft px-2.5 py-2 text-[11.5px] text-danger">
              {scan.error}
            </p>
          )}
        </div>

        {/* ── Core fields ──────────────────────────────────── */}
        <div className="card p-4">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title" field="title">
                Role / position
              </Label>
              <Input
                id="title"
                name="title"
                defaultValue={job?.title ?? ""}
                placeholder="e.g. Management Trainee Officer"
              />
            </div>

            <div>
              <Label htmlFor="company" field="company">
                Company
              </Label>
              <Input
                id="company"
                name="company"
                defaultValue={job?.company ?? ""}
                placeholder="e.g. Grameenphone"
              />
            </div>

            <div>
              <Label htmlFor="location" field="location">
                Location
              </Label>
              <Input
                id="location"
                name="location"
                defaultValue={job?.location ?? ""}
                placeholder="Dhaka"
              />
            </div>

            <div>
              <Label htmlFor="salary" field="salary">
                Salary
              </Label>
              <Input
                id="salary"
                name="salary"
                defaultValue={job?.salary ?? ""}
                placeholder="25,000 – 35,000 BDT"
              />
            </div>

            <div>
              <Label htmlFor="job_type" field="job_type">
                Type
              </Label>
              <select
                id="job_type"
                name="job_type"
                defaultValue={job?.job_type ?? ""}
                className="input"
              >
                <option value="">Not set</option>
                {JOB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="source" field="source">
                Source
              </Label>
              <select
                id="source"
                name="source"
                defaultValue={job?.source ?? ""}
                className="input"
              >
                <option value="">Not set</option>
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="url">Job link</Label>
              <Input
                id="url"
                name="url"
                type="url"
                defaultValue={job?.url ?? ""}
                placeholder="https://bdjobs.com/…"
              />
            </div>

            <div>
              <Label htmlFor="deadline" field="deadline">
                Application deadline
              </Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                defaultValue={formatDateInput(job?.deadline)}
                
              />
            </div>

            <div>
              <Label htmlFor="applied_at">Applied on</Label>
              <Input
                id="applied_at"
                name="applied_at"
                type="date"
                defaultValue={formatDateInput(job?.applied_at)}
                
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={job?.status ?? "saved"}
                className="input"
              >
                {STATUS_ORDER.map((s: Status) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                name="priority"
                defaultValue={String(job?.priority ?? 3)}
                className="input"
              >
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>
                    {p} · {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description" field="description">
                Summary
              </Label>
              <textarea
                id="description"
                name="description"
                defaultValue={job?.description ?? ""}
                rows={3}
                className="input resize-y"
                placeholder="Short description of the role and requirements."
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="notes">Private notes</Label>
              <textarea
                id="notes"
                name="notes"
                defaultValue={job?.notes ?? ""}
                rows={3}
                className="input resize-y"
                placeholder="Referral name, things to mention in the cover letter, interview prep…"
              />
            </div>
          </div>
        </div>

        {state?.error && (
          <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
            {state.error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Saving…" : job?.id ? "Save changes" : "Add job"}
          </Button>
          <Link
            href={job?.id ? `/jobs/${job.id}` : "/jobs"}
            className="btn btn-ghost h-9"
          >
            Cancel
          </Link>
          {job?.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost ml-auto"
            >
              <Icon name="external" size={13} />
              Open posting
            </a>
          )}
        </div>
      </form>
    </>
  );
}

async function postParse(body: Record<string, unknown>): Promise<{
  draft: Draft & { confidence: Record<string, number> };
  engine: string;
  warning?: string;
}> {
  const res = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Parser failed");
  return json;
}

function labelForEngine(engine: string): string {
  const [provider, mode] = engine.split(":");
  if (provider === "heuristic") return "offline parser";
  const names: Record<string, string> = {
    gemini: "Gemini",
    openrouter: "OpenRouter",
    groq: "Groq",
  };
  const name = names[provider] ?? provider;
  return mode === "vision" ? `${name} vision` : `${name} text`;
}
