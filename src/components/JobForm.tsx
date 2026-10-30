"use client";

import { saveJob } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRIORITY_LABELS, SOURCES, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { formatDateInput } from "@/lib/format";
import { fileToDataUrl, ocrDataUrl } from "@/lib/image";
import { extractJobUrl } from "@/lib/jobUrl";
import type { Job, Status } from "@/lib/types";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Icon } from "./Icon";

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
  const [postText, setPostText] = useState("");
  const [imagePreview, setImagePreview] = useState("");

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
      setImagePreview(dataUrl);
      let usedOcr = false;
      setScan({ busy: true, message: "Reading text from screenshot…", progress: 0 });
      const text = await ocrDataUrl(dataUrl, (pct) =>
        setScan((s) => ({ ...s, progress: pct }))
      );
      let res;
      if (text.trim().length > 20) {
        usedOcr = true;
        setPostText(text.trim());
        setField("url", extractJobUrl(text));
        res = await postParse({
          text,
          image: dataUrl,
          url: getField("url"),
          title: getField("title"),
        });
      } else {
        setScan({ busy: true, message: "OCR found little text; trying image AI…" });
        res = await postParse({
          image: dataUrl,
          url: getField("url"),
          title: getField("title"),
        });
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
          (usedOcr && res.engine === "offline:rules"
            ? "Image text was read with offline OCR and local rules; no AI request was needed. Review the extracted fields."
            : usedOcr && res.engine === "heuristic"
              ? "Image text was read with offline OCR. AI was unavailable, so review the extracted fields carefully."
            : res.warning) ??
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

  async function runTextParse(text = postText) {
    const value = text.trim();
    if (!value) {
      setScan({ busy: false, error: "Paste the job post text first." });
      return;
    }
    setScan({ busy: true, message: "Extracting job details from text…" });
    setConfidence({});
    try {
      setField("url", extractJobUrl(value));
      const res = await postParse({
        text: value,
        url: getField("url"),
        title: getField("title"),
        ...(imagePreview ? { image: imagePreview } : {}),
      });
      applyDraft(res.draft);
      setConfidence(res.draft.confidence ?? {});
      setScan({
        busy: false,
        engine: res.engine,
        message: res.warning ?? `Fields extracted (${labelForEngine(res.engine)}). Review before saving.`,
      });
    } catch (err) {
      setScan({ busy: false, error: err instanceof Error ? err.message : "Text extraction failed." });
    }
  }

  function handlePostPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
    const file = imageItem?.getAsFile();
    if (!file) return;
    event.preventDefault();
    if (fileRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileRef.current.files = transfer.files;
    }
    void runScan(file);
  }

  function handleImagePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented) return;
    const item = Array.from(event.clipboardData.items).find((entry) => entry.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) return;
    event.preventDefault();
    if (fileRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileRef.current.files = transfer.files;
    }
    void runScan(file);
  }

  function applyDraft(d: Draft) {
    setField("title", d.title);
    setField("company", d.company);
    setField("location", d.location);
    setField("salary", d.salary);
    setField("deadline", d.deadline, true);
    setField("description", d.description, true);
    setField("job_type", d.job_type, true);
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
          <span className="ml-1.5 font-normal normal-case tracking-normal text-warn">
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
        <input type="hidden" name="description" defaultValue={job?.description ?? ""} />
        <input type="hidden" name="job_type" defaultValue={job?.job_type ?? ""} />
        <input type="hidden" name="applied_at" defaultValue={formatDateInput(job?.applied_at)} />

        <div className="card p-4">
          <Label htmlFor="url">Job link</Label>
          <Input
            id="url"
            name="url"
            type="url"
            defaultValue={job?.url ?? ""}
            placeholder="https://…"
          />
          <p className="mt-1.5 text-[11px] text-muted">If the copied post includes an apply link, Extract fields will add it here automatically.</p>
        </div>

        {/* ── Screenshot scanner ───────────────────────────── */}
        <div
          className="card p-4"
          onPaste={handleImagePaste}
          tabIndex={0}
          aria-label="Screenshot upload area. Paste a copied image here."
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line-2 bg-surface-2">
              <Icon name="sparkles" size={16} className="text-muted" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">Add a post screenshot</div>
              <div className="text-[11px] text-muted">
                Take or upload a screenshot, or copy an image and paste it here. You can also paste post text below.
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={scan.busy}
            >
              <Icon name="camera" size={14} />
              {scan.busy ? "Reading…" : "Camera / gallery"}
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

          {imagePreview && (
            <img
              src={imagePreview}
              alt="Screenshot being used to extract job details"
              className="mt-3 max-h-56 w-full rounded-lg border border-line object-contain"
            />
          )}

          <div className="mt-3 rounded-md border border-dashed border-line-2 px-3 py-2 text-center text-[11px] text-muted">
            Copy an image, then tap/click this card and paste it here.
          </div>

          <label htmlFor="post-text" className="label mt-4">Or paste the job post text</label>
          <textarea
            id="post-text"
            value={postText}
            onChange={(event) => setPostText(event.target.value)}
            onPaste={handlePostPaste}
            rows={5}
            className="input resize-y"
            placeholder="Copy the post from Facebook, BDJobs, or another site and paste it here…"
            disabled={scan.busy}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full sm:w-auto"
            onClick={() => void runTextParse()}
            disabled={scan.busy || !postText.trim()}
          >
            <Icon name="sparkles" size={14} />
            Extract fields
          </Button>

          {scan.busy && typeof scan.progress === "number" && (
            <div className="mt-3">
              <div className="h-1 overflow-hidden rounded-full bg-surface-3">
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
            <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-success/25 bg-success-soft px-2.5 py-2 text-[11.5px] text-success">
              <Icon name="check" size={13} className="mt-0.5 shrink-0" />
              {scan.message}
            </p>
          )}
          {scan.error && (
            <p className="mt-2.5 rounded-md border border-danger/25 bg-danger-soft px-2.5 py-2 text-[11.5px] text-danger">
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
          <p className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
            {state.error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="lg" disabled={pending || scan.busy}>
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
  if (engine === "offline:rules") return "offline rules";
  if (provider === "heuristic") return "offline parser";
  const names: Record<string, string> = {
    gemini: "Gemini",
    openrouter: "OpenRouter",
    groq: "Groq",
  };
  const name = names[provider] ?? provider;
  return mode === "vision" ? `${name} vision` : `${name} text`;
}
