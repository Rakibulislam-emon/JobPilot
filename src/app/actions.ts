"use server";

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

function num(fd: FormData, key: string, fallback: number): number {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? n : fallback;
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
    priority: Math.min(5, Math.max(1, num(formData, "priority", 3))),
    description: str(formData, "description"),
    notes: str(formData, "notes"),
  };

  if (job.url && !isHttpUrl(job.url)) {
    return { error: "Enter a valid job link starting with https:// or http://." };
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
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
