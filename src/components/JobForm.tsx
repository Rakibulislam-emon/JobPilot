"use client";

import { saveJob } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_TYPES, SOURCES, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { formatDateInput } from "@/lib/format";
import { ocrDataUrl, prepareImage } from "@/lib/image";
import {
  extractJobUrl,
  getApplicationHref,
  getApplicationLinkLabel,
} from "@/lib/jobUrl";
import type { Job, Status } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { DeadlinePicker } from "./DeadlinePicker";
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

export function JobForm({
  job,
  onCancel,
  stickyActions = false,
  idPrefix,
}: {
  job?: Job;
  /** When provided, Cancel closes the surrounding dialog instead of navigating. */
  onCancel?: () => void;
  /** Pin the submit row to the bottom of a scrollable container (modal). */
  stickyActions?: boolean;
  /** Namespaces field ids so two forms can coexist on one page. */
  idPrefix?: string;
}) {
  const fid = (name: string) => (idPrefix ? `${idPrefix}-${name}` : name);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [scan, setScan] = useState<ScanState>({ busy: false });
  const [postText, setPostText] = useState(() => {
    const raw = job?.ai_meta?.raw_post;
    return typeof raw === "string" ? raw : "";
  });
  const [deadline, setDeadline] = useState(() => formatDateInput(job?.deadline));
  const [jobType, setJobType] = useState(job?.job_type || "full-time");
  const [source, setSource] = useState(job?.source ?? "");
  const [jobStatus, setJobStatus] = useState(job?.status ?? "saved");
  const [imagePreview, setImagePreview] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) => {
      const result = await saveJob(fd);
      return (result as { error?: string; ok?: boolean } | undefined) ?? null;
    },
    null
  );

  useEffect(() => {
    if (!state?.ok) return;
    onCancel?.();
    router.refresh();
  }, [onCancel, router, state]);

  function setField(name: string, value: string, overwrite = false) {
    if (!value) return;
    if (name === "deadline") {
      setDeadline(value);
      return;
    }
    const form = formRef.current;
    if (!form) return;
    const el = form.elements.namedItem(name);
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
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
    let uploadPrepared = false;

    try {
      const { dataUrl, file: uploadFile } = await prepareImage(file);
      if (fileRef.current) {
        const transfer = new DataTransfer();
        transfer.items.add(uploadFile);
        fileRef.current.files = transfer.files;
      }
      uploadPrepared = true;
      setImagePreview(dataUrl);

      // OCR downloads ~10 MB of language data and takes seconds on a phone.
      // When the user already pasted the post text we have a cleaner source,
      // so go straight to extraction instead of reading the screenshot.
      const pasted = postText.trim();
      let usedOcr = false;
      let res;

      if (pasted.length >= 24) {
        setScan({ busy: true, message: "Extracting job details…" });
        setField("url", extractJobUrl(pasted));
        res = await postParse({
          text: pasted,
          image: dataUrl,
          url: getField("url"),
          title: getField("title"),
        });
      } else {
        setScan({ busy: true, message: "Reading text from screenshot…", progress: 0 });
        const text = await ocrDataUrl(dataUrl, (pct) =>
          setScan((s) => ({ ...s, progress: pct }))
        );
        if (text.trim().length > 20) {
          usedOcr = true;
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
      if (!uploadPrepared && fileRef.current) fileRef.current.value = "";
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
    if (d.job_type) setJobType(d.job_type);
    if (d.source && !source) setSource(d.source);
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
        {onCancel && <input type="hidden" name="modal_form" value="true" />}
        {job?.screenshot && (
          <input type="hidden" name="screenshot" defaultValue={job.screenshot} />
        )}
        <input type="hidden" name="description" defaultValue={job?.description ?? ""} />
        <input type="hidden" name="applied_at" defaultValue={formatDateInput(job?.applied_at)} />
        <input type="hidden" name="interview_date" defaultValue={formatDateInput(job?.interview_date)} />
        {/* Preserve the original pasted post verbatim for future re-extraction. */}
        <input type="hidden" name="raw_post" value={postText} />
        <input
          type="hidden"
          name="ai_meta"
          value={job?.ai_meta ? JSON.stringify(job.ai_meta) : ""}
        />

        <div className="card p-4">
          <Label htmlFor={fid("url")}>Apply link or contact</Label>
          <Input
            id={fid("url")}
            name="url"
            type="text"
            defaultValue={job?.url ?? ""}
            autoCapitalize="none"
            placeholder="URL, email, or WhatsApp number"
          />
          <p className="mt-1.5 text-[11px] text-muted">Extract fields adds an apply URL, email address, or WhatsApp number from the post when available.</p>
        </div>

        {/* ── Screenshot scanner ───────────────────────────── */}
        <div
          className="card p-4"
          onPaste={handleImagePaste}
          tabIndex={0}
          aria-label="Screenshot upload area. Paste a copied image here."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line-2 bg-surface-2">
                <Icon name="sparkles" size={16} className="text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">Add a post screenshot</div>
                <div className="text-[11px] text-muted">
                  Take or upload a screenshot, or copy an image and paste it here. You can also paste post text below.
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
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

          <label htmlFor={fid("post-text")} className="label mt-4">Or paste the job post text</label>
          <textarea
            id={fid("post-text")}
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
              <Label htmlFor={fid("title")} field="title">
                Role / position
              </Label>
              <Input
                id={fid("title")}
                name="title"
                defaultValue={job?.title ?? ""}
                placeholder="e.g. Management Trainee Officer"
              />
            </div>

            <div>
              <Label htmlFor={fid("company")} field="company">
                Company
              </Label>
              <Input
                id={fid("company")}
                name="company"
                defaultValue={job?.company ?? ""}
                placeholder="e.g. Grameenphone"
              />
            </div>

            <div>
              <Label htmlFor={fid("location")} field="location">
                Location
              </Label>
              <Input
                id={fid("location")}
                name="location"
                defaultValue={job?.location ?? ""}
                placeholder="Dhaka"
              />
            </div>

            <div>
              <Label htmlFor={fid("salary")} field="salary">
                Salary
              </Label>
              <Input
                id={fid("salary")}
                name="salary"
                defaultValue={job?.salary ?? ""}
                placeholder="25,000 – 35,000 BDT"
              />
            </div>

            <div>
              <Label htmlFor={fid("job_type")}>Employment type</Label>
              <input type="hidden" name="job_type" value={jobType} />
              <Select value={jobType} onValueChange={(value) => setJobType(value ?? "")}>
                <SelectTrigger id={fid("job_type")} className="h-9 w-full text-[12.5px]">
                  <SelectValue>
                    {(value) =>
                      JOB_TYPES.find((type) => type.value === value)?.label ?? String(value ?? "")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {job?.job_type && !JOB_TYPES.some((type) => type.value === job.job_type) && (
                    <SelectItem value={job.job_type}>{job.job_type}</SelectItem>
                  )}
                  {JOB_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor={fid("source")} field="source">
                Source
              </Label>
              <input type="hidden" name="source" value={source} />
              <Select
                value={source || "__none__"}
                onValueChange={(value) => setSource(value === "__none__" ? "" : (value ?? ""))}
              >
                <SelectTrigger id={fid("source")} className="h-9 w-full text-[12.5px]">
                  <SelectValue>
                    {(value) =>
                      value === "__none__"
                        ? "Not set"
                        : SOURCES.find((item) => item.value === value)?.label ?? "Not set"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  {SOURCES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor={fid("deadline")} field="deadline">
                Application deadline
              </Label>
              <DeadlinePicker
                id={fid("deadline")}
                name="deadline"
                value={deadline}
                onChange={setDeadline}
              />
            </div>

            <div>
              <Label htmlFor={fid("status")}>Status</Label>
              <input type="hidden" name="status" value={jobStatus} />
              <Select value={jobStatus} onValueChange={(value) => setJobStatus((value ?? "saved") as Status)}>
                <SelectTrigger id={fid("status")} className="h-9 w-full text-[12.5px]">
                  <SelectValue>
                    {(value) => STATUS_META[value as Status]?.label ?? "Saved"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((option) => (
                    <SelectItem key={option} value={option}>
                      {STATUS_META[option].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor={fid("notes")}>Private notes</Label>
              <textarea
                id={fid("notes")}
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

        <div
          className={
            stickyActions
              ? "sticky bottom-0 z-10 -mx-4 mt-1 flex flex-wrap items-center gap-2 border-t border-line bg-bg/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6"
              : "flex flex-wrap items-center gap-2"
          }
        >
          <Button type="submit" size="lg" disabled={pending || scan.busy}>
            {pending ? "Saving…" : job?.id ? "Save changes" : "Add job"}
          </Button>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="btn btn-ghost h-9">
              Cancel
            </button>
          ) : (
            <Link
              href={job?.id ? `/jobs/${job.id}` : "/jobs"}
              className="btn btn-ghost h-9"
            >
              Cancel
            </Link>
          )}
          {job?.url && (
            <a
              href={getApplicationHref(job.url) ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost ml-auto"
            >
              <Icon name="external" size={13} />
              {getApplicationLinkLabel(job.url)}
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
