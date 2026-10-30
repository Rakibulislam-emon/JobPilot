"use server";

import { removeAiProviderKey, saveAiProviderKey, type AiProviderId } from "@/lib/aiKeyVault";
import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProviderKeyActionState = { ok?: boolean; message?: string };

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
