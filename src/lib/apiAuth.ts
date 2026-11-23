import { createHash } from "node:crypto";
import { EXTENSION_TOKEN } from "./env";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

let cachedOwnerId: string | null = null;

/** Single-user app: the owner is simply the only account in the project. */
export async function getOwnerUserId(): Promise<string | null> {
  if (cachedOwnerId) return cachedOwnerId;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 2,
    });
    if (error || !data.users.length) return null;
    cachedOwnerId = data.users[0].id;
    return cachedOwnerId;
  } catch {
    return null;
  }
}

export type ApiAuth = { ok: true; userId: string } | { ok: false; status: number; message: string };

export async function authorizeApi(req: Request): Promise<ApiAuth> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  if (token) {
    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch (error) {
      if (isLegacyToken(token)) return authorizeLegacyToken();
      return {
        ok: false,
        status: 500,
        message: error instanceof Error ? error.message : "API token lookup is unavailable.",
      };
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data: apiToken, error: lookupError } = await admin
      .from("api_tokens")
      .select("user_id")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();

    if (lookupError) {
      if (isLegacyToken(token)) return authorizeLegacyToken();
      return {
        ok: false,
        status: 500,
        message: `Could not verify API token: ${lookupError.message}`,
      };
    }

    if (apiToken) {
      const { error: updateError } = await admin
        .from("api_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("token_hash", tokenHash)
        .is("revoked_at", null);

      if (updateError) {
        return {
          ok: false,
          status: 500,
          message: `Could not update API token usage: ${updateError.message}`,
        };
      }

      return { ok: true, userId: apiToken.user_id };
    }

    if (isLegacyToken(token)) return authorizeLegacyToken();

    return { ok: false, status: 401, message: "Invalid API token." };
  }

  // Fall back to a browser session (used by the website's screenshot scanner).
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return { ok: true, userId: user.id };
  } catch {
    /* ignore */
  }

  return { ok: false, status: 401, message: "Not authenticated." };
}

function isLegacyToken(token: string): boolean {
  return Boolean(
    EXTENSION_TOKEN &&
      EXTENSION_TOKEN !== "change-me-to-a-long-random-string" &&
      safeEqual(token, EXTENSION_TOKEN)
  );
}

async function authorizeLegacyToken(): Promise<ApiAuth> {
  const userId = await getOwnerUserId();
  if (userId) return { ok: true, userId };
  return {
    ok: false,
    status: 500,
    message:
      "No Supabase user found. Create your account in Supabase → Authentication → Users.",
  };
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
