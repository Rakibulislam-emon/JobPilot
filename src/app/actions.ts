"use server";

import { isQuestionStatus } from "@/lib/constants";
import { isValidApplicationLink } from "@/lib/jobUrl";
import { removeScreenshot, uploadFile } from "@/lib/storage";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { Status } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const STATUSES: Status[] = [
  "saved",
  "applied",
  "oa",
  "interview",
  "offer",
  "rejected",
  "ghosted",
  "withdrawn",
];

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function dateOrNull(value: string): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function saveJob(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const id = str(formData, "id");
  const statusRaw = str(formData, "status") || "saved";
  const status = (STATUSES.includes(statusRaw as Status) ? statusRaw : "saved") as Status;

  // Keep the original pasted post so details can be re-extracted later, even
  // if the source post is deleted. Stored in the existing ai_meta JSONB column.
  const rawValue = formData.get("raw_post");
  const rawPost = typeof rawValue === "string" ? rawValue : "";
  const metaValue = str(formData, "ai_meta");
  let aiMeta: Record<string, unknown> = {};
  if (metaValue) {
    try {
      const parsed = JSON.parse(metaValue);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        aiMeta = parsed as Record<string, unknown>;
      }
    } catch {
      // Malformed meta is ignored rather than failing the whole save.
    }
  }
  if (rawPost.trim()) {
    aiMeta = {
      ...aiMeta,
      raw_post: rawPost.slice(0, 100_000),
      raw_post_type: "text",
      raw_post_saved_at: new Date().toISOString(),
    };
  }

  const job = {
    company: str(formData, "company"),
    title: str(formData, "title"),
    location: str(formData, "location"),
    salary: str(formData, "salary"),
    job_type: str(formData, "job_type"),
    source: str(formData, "source"),
    url: str(formData, "url"),
    deadline: dateOrNull(str(formData, "deadline")),
    applied_at:
      dateOrNull(str(formData, "applied_at")) ??
      (status === "applied" ? new Date().toISOString().slice(0, 10) : null),
    status,
    description: str(formData, "description"),
    notes: str(formData, "notes"),
    ai_meta: Object.keys(aiMeta).length > 0 ? aiMeta : null,
  };

  if (job.url && !isValidApplicationLink(job.url)) {
    return { error: "Enter a valid apply link, email address, or WhatsApp number." };
  }
  if (!job.url && !job.title && !job.company) {
    return { error: "Add a job link, role, or company before saving." };
  }

  // Optional new screenshot file
  const file = formData.get("screenshot_file");
  let screenshot = str(formData, "screenshot") || null;
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadFile(user.id, file);
    if (uploaded) {
      if (screenshot && screenshot !== uploaded) await removeScreenshot(screenshot);
      screenshot = uploaded;
    }
  }

  if (id) {
    const { data: previous } = await supabase
      .from("jobs")
      .select("status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase
      .from("jobs")
      .update({ ...job, screenshot })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { error: error.message };

    if (previous && previous.status !== job.status) {
      await supabase.from("activities").insert({
        job_id: id,
        user_id: user.id,
        kind: "status",
        from_status: previous.status,
        to_status: job.status,
        note: "",
      });
    }

    revalidateAll();
    if (str(formData, "modal_form") === "true") return { ok: true as const };
    redirect(`/jobs/${id}`);
  }

  const { data: created, error } = await supabase
    .from("jobs")
    .insert({ ...job, user_id: user.id, screenshot })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Could not save the job." };
  }

  await supabase.from("activities").insert({
    job_id: created.id,
    user_id: user.id,
    kind: "created",
    to_status: job.status,
    note: "",
  });

  revalidateAll();
  redirect(`/jobs/${created.id}`);
}

export async function updateStatus(jobId: string, status: Status): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  if (!STATUSES.includes(status)) return { error: "Invalid job status." };

  const { data: previous } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!previous) return { error: "Job not found or access denied." };

  const patch: Record<string, unknown> = { status };
  if (status === "applied" && previous?.status !== "applied") {
    patch.applied_at = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", jobId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  if (previous && previous.status !== status) {
    await supabase.from("activities").insert({
      job_id: jobId,
      user_id: user.id,
      kind: "status",
      from_status: previous.status,
      to_status: status,
      note: "",
    });
  }

  revalidateAll();
  return { ok: true };
}

export async function addNote(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const jobId = str(formData, "job_id");
  const note = str(formData, "note");
  if (!jobId || !note) return;

  await supabase.from("activities").insert({
    job_id: jobId,
    user_id: user.id,
    kind: "note",
    note: note.slice(0, 2000),
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
}

export async function addContact(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const jobId = str(formData, "job_id");
  if (!jobId) return;

  await supabase.from("contacts").insert({
    job_id: jobId,
    user_id: user.id,
    name: str(formData, "name").slice(0, 80),
    role: str(formData, "role").slice(0, 80),
    email: str(formData, "email").slice(0, 120),
    phone: str(formData, "phone").slice(0, 40),
  });

  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteContact(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const contactId = str(formData, "contact_id");
  const jobId = str(formData, "job_id");
  if (!contactId) return;

  await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("user_id", user.id);

  revalidatePath(`/jobs/${jobId}`);
}

// ── Interview question bank ─────────────────────────────────

export async function addInterviewQuestion(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const jobId = str(formData, "job_id");
  const question = str(formData, "question").slice(0, 2000);
  if (!jobId || !question) return;

  const statusRaw = str(formData, "status") || "missed";
  const status = isQuestionStatus(statusRaw) ? statusRaw : "missed";

  // Ownership check before attaching a question to a job.
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();
  if (!job) return;

  await supabase.from("interview_questions").insert({
    job_id: jobId,
    user_id: user.id,
    round: str(formData, "round").slice(0, 120),
    question,
    answer: str(formData, "answer").slice(0, 4000),
    status,
  });

  revalidateQuestionPaths(jobId);
}

export async function updateInterviewQuestion(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const id = str(formData, "id");
  const question = str(formData, "question").slice(0, 2000);
  const statusRaw = str(formData, "status");
  if (!id || !question || !isQuestionStatus(statusRaw)) return;

  const jobId = await ownQuestionJobId(supabase, id, user.id);
  if (!jobId) return;

  await supabase
    .from("interview_questions")
    .update({
      round: str(formData, "round").slice(0, 120),
      question,
      answer: str(formData, "answer").slice(0, 4000),
      status: statusRaw,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidateQuestionPaths(jobId);
}

export async function setInterviewQuestionStatus(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const id = str(formData, "id");
  const statusRaw = str(formData, "status");
  if (!id || !isQuestionStatus(statusRaw)) return;

  const jobId = await ownQuestionJobId(supabase, id, user.id);
  if (!jobId) return;

  await supabase
    .from("interview_questions")
    .update({ status: statusRaw })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidateQuestionPaths(jobId);
}

export async function deleteInterviewQuestion(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const id = str(formData, "id");
  if (!id) return;

  const jobId = await ownQuestionJobId(supabase, id, user.id);
  if (!jobId) return;

  await supabase
    .from("interview_questions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidateQuestionPaths(jobId);
}

async function ownQuestionJobId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("interview_questions")
    .select("job_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return data?.job_id ?? null;
}

function revalidateQuestionPaths(jobId: string) {
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/prep");
}

export async function deleteJobs(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const ids = Array.from(
    new Set(
      formData
        .getAll("ids")
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  ).slice(0, 200);
  if (ids.length === 0) return;

  // Only rows the signed-in user owns can be deleted.
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, screenshot")
    .in("id", ids)
    .eq("user_id", user.id);

  if (!jobs?.length) return;

  await supabase
    .from("jobs")
    .delete()
    .in("id", jobs.map((job) => job.id))
    .eq("user_id", user.id);

  await Promise.all(jobs.map((job) => removeScreenshot(job.screenshot)));

  revalidateAll();
}

export async function deleteJob(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const id = str(formData, "id");
  if (!id) return;

  const { data: job } = await supabase
    .from("jobs")
    .select("screenshot")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  await supabase.from("jobs").delete().eq("id", id).eq("user_id", user.id);

  if (job?.screenshot) await removeScreenshot(job.screenshot);

  revalidateAll();
  redirect("/jobs");
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/board");
  revalidatePath("/prep");
}
