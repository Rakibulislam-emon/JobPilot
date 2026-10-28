export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── AI providers ─────────────────────────────────────────────
// Any of these work. The first one that is configured and responds wins.
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
export const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

/** Force a single provider: gemini | openrouter | groq (empty = auto). */
export const AI_PROVIDER = (process.env.AI_PROVIDER ?? "").toLowerCase();

export const EXTENSION_TOKEN = process.env.EXTENSION_TOKEN ?? "";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;
