import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadScreenshot } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_STATUS = [
  "saved",
  "applied",
  "oa",
  "interview",
  "offer",
  "rejected",
  "ghosted",
  "withdrawn",
];

function text(value: unknown, max = 400): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isoDate(value: unknown): string | null {
  const v = text(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export async function POST(req: Request) {
  const auth = await authorizeApi(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const company = text(body.company, 120);
  const title = text(body.title, 160);
  if (!company && !title) {
    return NextResponse.json(
      { error: "A company or job title is required." },
      { status: 400 }
    );
  }

  const url = text(body.url, 1000);
  const statusRaw = text(body.status, 20) || "saved";
  const status = ALLOWED_STATUS.includes(statusRaw) ? statusRaw : "saved";
  const admin = createAdminClient();

  // Duplicate guard — same URL already tracked
  if (url) {
    const { data: existing } = await admin
      .from("jobs")
      .select("id, company, title, status, url")
      .eq("user_id", auth.userId)
      .eq("url", url)
      .limit(1);

    if (existing && existing.length > 0 && body.force !== true) {
      return NextResponse.json({
        duplicate: true,
        job: existing[0],
        message: "This URL is already in your JobDesk.",
      });
    }
  }

  let screenshot: string | null = null;
  const image = text(body.image, 0);
  if (typeof body.image === "string" && body.image.startsWith("data:image/")) {
    screenshot = await uploadScreenshot(auth.userId, body.image);
  }

  const payload = {
    user_id: auth.userId,
    company,
    title,
    location: text(body.location, 120),
    salary: text(body.salary, 160),
    job_type: text(body.job_type, 30),
    source: text(body.source, 30),
    url,
    deadline: isoDate(body.deadline),
    applied_at: isoDate(body.applied_at),
    status,
    priority: Math.min(5, Math.max(1, Number(body.priority) || 3)),
    description: text(body.description, 4000),
    notes: text(body.notes, 4000),
    screenshot,
    ai_meta:
      body.ai_meta && typeof body.ai_meta === "object" ? body.ai_meta : null,
  };

  const { data: created, error } = await admin
    .from("jobs")
    .insert(payload)
    .select("id")
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed." },
      { status: 500 }
    );
  }

  await admin.from("activities").insert({
    job_id: created.id,
    user_id: auth.userId,
    kind: "created",
    to_status: status,
    note: "Captured with the browser extension",
  });

  for (const contact of Array.isArray(body.contacts) ? body.contacts : []) {
    const c = contact as Record<string, unknown>;
    const name = text(c.name, 80);
    const email = text(c.email, 120);
    const phone = text(c.phone, 40);
    if (!name && !email && !phone) continue;
    await admin.from("contacts").insert({
      job_id: created.id,
      user_id: auth.userId,
      name,
      role: text(c.role, 80),
      email,
      phone,
    });
  }

  return NextResponse.json({
    ok: true,
    id: created.id,
    url: `/jobs/${created.id}`,
  });
}
