import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_KEY, SUPABASE_URL } from "../env";

/** Service-role client. Server only — never import this from a client component. */
export function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. It is required for screenshot storage and extension writes."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signedScreenshotUrl(
  path?: string | null
): Promise<string | null> {
  if (!path) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("shots").createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
