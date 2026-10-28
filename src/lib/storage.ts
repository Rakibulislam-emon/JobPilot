import { createAdminClient } from "./supabase/admin";

const BUCKET = "shots";

export async function uploadScreenshot(
  userId: string,
  dataUrl: string
): Promise<string | null> {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;

  const mime = match[1];
  const ext = mime.includes("webp")
    ? "webp"
    : mime.includes("png")
      ? "png"
      : "jpg";
  const buffer = Buffer.from(match[2], "base64");
  const path = `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    console.error("screenshot upload failed", error.message);
    return null;
  }
  return path;
}

export async function uploadFile(
  userId: string,
  file: File
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) return null;
  if (file.size > 8 * 1024 * 1024) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type.includes("png")
    ? "png"
    : file.type.includes("webp")
      ? "webp"
      : "jpg";
  const path = `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("file upload failed", error.message);
    return null;
  }
  return path;
}

export async function removeScreenshot(path?: string | null) {
  if (!path) return;
  try {
    const admin = createAdminClient();
    await admin.storage.from(BUCKET).remove([path]);
  } catch {
    /* ignore */
  }
}
