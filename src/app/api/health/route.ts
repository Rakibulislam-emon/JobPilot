import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/extract";
import {
  EXTENSION_TOKEN,
  SUPABASE_SERVICE_KEY,
  isSupabaseConfigured,
} from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const ai = aiStatus();
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
