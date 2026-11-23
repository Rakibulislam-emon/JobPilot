"use server";

import { createHash, randomBytes } from "node:crypto";
import { removeAiProviderKey, saveAiProviderKey, type AiProviderId } from "@/lib/aiKeyVault";
import { createClient, requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProviderKeyActionState = { ok?: boolean; message?: string };
export type ApiTokenActionState = {
  ok?: boolean;
  message?: string;
  token?: string;
};

const PROVIDERS: AiProviderId[] = ["gemini", "openrouter", "groq"];

export async function saveProviderKey(
  _previous: ProviderKeyActionState,
  formData: FormData
): Promise<ProviderKeyActionState> {
  const user = await requireUser();
  const provider = String(formData.get("provider") ?? "") as AiProviderId;
  const key = String(formData.get("apiKey") ?? "").trim();
  if (!PROVIDERS.includes(provider)) return { message: "Choose a supported provider." };
  try {
    await saveAiProviderKey(user.id, provider, key);
    revalidatePath("/settings");
    return { ok: true, message: "Key saved securely. It will be used for future extraction." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Could not save this key." };
  }
}

export async function deleteProviderKey(
  _previous: ProviderKeyActionState,
  formData: FormData
): Promise<ProviderKeyActionState> {
  const user = await requireUser();
  const provider = String(formData.get("provider") ?? "") as AiProviderId;
  if (!PROVIDERS.includes(provider)) return { message: "Choose a supported provider." };
  try {
    await removeAiProviderKey(user.id, provider);
    revalidatePath("/settings");
    return { ok: true, message: "Saved key removed." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Could not remove this key." };
  }
}

export async function createMuseApiToken(
  _previous: ApiTokenActionState,
  _formData: FormData
): Promise<ApiTokenActionState> {
  const user = await requireUser();
  const supabase = await createClient();
  const token = `jd_${randomBytes(32).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { error } = await supabase.from("api_tokens").insert({
    user_id: user.id,
    token_hash: tokenHash,
  });

  if (error) return { message: `Could not create the key: ${error.message}` };

  revalidatePath("/settings");
  return { ok: true, token };
}

export async function revokeMuseApiToken(
  _previous: ApiTokenActionState,
  formData: FormData
): Promise<ApiTokenActionState> {
  const user = await requireUser();
  const tokenId = String(formData.get("tokenId") ?? "");
  if (!/^[\da-f-]{36}$/i.test(tokenId)) {
    return { message: "Invalid API key." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { message: `Could not revoke the key: ${error.message}` };
  if (!data) return { message: "This key is already revoked or no longer exists." };

  revalidatePath("/settings");
  return { ok: true, message: "Key revoked." };
}
