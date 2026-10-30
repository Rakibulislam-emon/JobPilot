import { createAdminClient } from "@/lib/supabase/admin";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type AiProviderId = "gemini" | "openrouter" | "groq";
export type AiProviderKeys = Partial<Record<AiProviderId, string>>;

const PROVIDERS: AiProviderId[] = ["gemini", "openrouter", "groq"];

function encryptionKey(): Buffer {
  const value = process.env.AI_KEYS_ENCRYPTION_KEY ?? "";
  if (!/^[\da-f]{64}$/i.test(value)) {
    throw new Error("Set AI_KEYS_ENCRYPTION_KEY to a random 64-character hexadecimal secret before saving provider keys.");
  }
  return Buffer.from(value, "hex");
}

export function isAiKeyVaultConfigured(): boolean {
  return /^[\da-f]{64}$/i.test(process.env.AI_KEYS_ENCRYPTION_KEY ?? "");
}

function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value: string): string {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !encrypted) throw new Error("Stored provider key is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export async function getAiProviderKeys(userId: string): Promise<AiProviderKeys> {
  if (!isAiKeyVaultConfigured()) return {};
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ai_provider_keys")
      .select("provider, encrypted_key")
      .eq("user_id", userId);
    if (error) return {};

    const keys: AiProviderKeys = {};
    for (const row of data ?? []) {
      if (PROVIDERS.includes(row.provider as AiProviderId)) {
        keys[row.provider as AiProviderId] = decrypt(row.encrypted_key);
      }
    }
    return keys;
  } catch {
    return {};
  }
}

export async function getAiProviderKeyStatus(userId: string): Promise<{
  available: boolean;
  configured: AiProviderId[];
  schemaReady: boolean;
}> {
  if (!isAiKeyVaultConfigured()) return { available: false, configured: [], schemaReady: false };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ai_provider_keys")
      .select("provider")
      .eq("user_id", userId);
    if (error) return { available: true, configured: [], schemaReady: false };
    return {
      available: true,
      configured: (data ?? []).map((row) => row.provider as AiProviderId),
      schemaReady: true,
    };
  } catch {
    return { available: true, configured: [], schemaReady: false };
  }
}

export async function saveAiProviderKey(userId: string, provider: AiProviderId, key: string): Promise<void> {
  if (!PROVIDERS.includes(provider)) throw new Error("Unsupported AI provider.");
  if (key.length < 20 || key.length > 500 || /\s/.test(key)) {
    throw new Error("Enter a valid provider API key.");
  }
  const admin = createAdminClient();
  const { error } = await admin.from("ai_provider_keys").upsert({
    user_id: userId,
    provider,
    encrypted_key: encrypt(key),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" });
  if (error) throw new Error(`Could not save provider key: ${error.message}`);
}

export async function removeAiProviderKey(userId: string, provider: AiProviderId): Promise<void> {
  if (!PROVIDERS.includes(provider)) throw new Error("Unsupported AI provider.");
  const admin = createAdminClient();
  const { error } = await admin
    .from("ai_provider_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw new Error(`Could not remove provider key: ${error.message}`);
}
