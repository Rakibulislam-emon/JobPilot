import { getAiProviderKeys } from "@/lib/aiKeyVault";
import { getOwnerUserId } from "@/lib/apiAuth";
import {
    EXTENSION_TOKEN,
    SUPABASE_SERVICE_KEY,
    isSupabaseConfigured,
} from "@/lib/env";
import { aiStatus } from "@/lib/extract";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ownerId = await getOwnerUserId();
  const savedKeys = ownerId ? await getAiProviderKeys(ownerId) : {};
  const ai = aiStatus(savedKeys);
  return NextResponse.json({
    ok: true,
    supabase: isSupabaseConfigured,
    serviceRole: SUPABASE_SERVICE_KEY.length > 20,
    ai: ai.primary,
    aiProviders: ai.providers,
    extensionToken:
      Boolean(EXTENSION_TOKEN) && EXTENSION_TOKEN !== "change-me-to-a-long-random-string",
  });
}
