import { getAiProviderKeys } from "@/lib/aiKeyVault";
import { getOwnerUserId } from "@/lib/apiAuth";
import {
  APP_URL,
  EXTENSION_TOKEN,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/env";
import { aiStatus } from "@/lib/extract";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ownerId = await getOwnerUserId();
  const savedKeys = ownerId ? await getAiProviderKeys(ownerId) : {};
  const ai = aiStatus(savedKeys);
  // Presence flags only — never expose the values themselves.
  return NextResponse.json({
    ok: true,
    supabase: isSupabaseConfigured,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL.startsWith("http"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY.length > 20,
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY.length > 20,
      EXTENSION_TOKEN:
        Boolean(EXTENSION_TOKEN) &&
        EXTENSION_TOKEN !== "change-me-to-a-long-random-string",
      NEXT_PUBLIC_APP_URL:
        APP_URL.startsWith("http") && !APP_URL.includes("localhost"),
    },
    serviceRole: SUPABASE_SERVICE_KEY.length > 20,
    ai: ai.primary,
    aiProviders: ai.providers,
    extensionToken:
      Boolean(EXTENSION_TOKEN) && EXTENSION_TOKEN !== "change-me-to-a-long-random-string",
  });
}
