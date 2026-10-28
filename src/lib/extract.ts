import {
  AI_PROVIDER,
  GEMINI_API_KEY,
  GROQ_API_KEY,
  OPENROUTER_API_KEY,
} from "./env";
import type { Draft } from "./types";

// ─────────────────────────────────────────────────────────────
//  Providers — all speak the OpenAI chat-completions dialect,
//  so one code path handles text and vision for every vendor.
// ─────────────────────────────────────────────────────────────

export type ProviderId = "gemini" | "openrouter" | "groq";

type ProviderConfig = {
  id: ProviderId;
  label: string;
  baseUrl: string;
  apiKey: string;
  /** First entry is the preferred model; the rest are fallbacks. */
  models: string[];
  supportsJsonMode: boolean;
};

/** "a, b, c" or "a" → ["a","b","c"], falling back to the defaults. */
function modelList(envValue: string | undefined, defaults: string[]): string[] {
  const custom = (envValue ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return custom.length > 0 ? [...custom, ...defaults] : defaults;
}

export function configuredProviders(): ProviderConfig[] {
  const candidates: ProviderConfig[] = [
    {
      id: "gemini",
      label: "Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: GEMINI_API_KEY,
      models: modelList(process.env.GEMINI_MODEL, [
        "gemini-flash-latest",
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
      ]),
      supportsJsonMode: true,
    },
    {
      id: "openrouter",
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: OPENROUTER_API_KEY,
      // "openrouter/free" is a router that always points at a live free model,
      // so this default does not rot when a model gets retired.
      models: modelList(process.env.OPENROUTER_MODEL, [
        "openrouter/free",
        "google/gemma-4-31b-it:free",
        "nvidia/nemotron-3.5-super-vl:free",
      ]),
      supportsJsonMode: true,
    },
    {
      id: "groq",
      label: "Groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: GROQ_API_KEY,
      models: modelList(process.env.GROQ_MODEL, [
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.3-70b-versatile",
      ]),
      supportsJsonMode: true,
    },
  ];

  const available = candidates.filter((p) => p.apiKey.length > 10);
  return AI_PROVIDER ? available.filter((p) => p.id === AI_PROVIDER) : available;
}

export function aiStatus(): {
  providers: { id: string; model: string; models: string[] }[];
  primary: string;
} {
  const providers = configuredProviders();
  return {
    providers: providers.map((p) => ({
      id: p.id,
      model: p.models[0],
      models: p.models,
    })),
    primary: providers[0]?.id ?? "offline",
  };
}

// ─────────────────────────────────────────────────────────────
//  Prompt
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You extract structured data from job postings.

The input may be raw text from a webpage, a screenshot of a social media post, or both.
Bangladeshi job boards (BDJobs) and Facebook groups are common sources, so text may mix
English and Bangla. Handle both.

If the text looks like webpage chrome (navigation menus, "See more comments", cookie
banners, sidebar links) rather than the job post itself, rely on the screenshot instead
and ignore the junk. Only extract the job that is the subject of the page.

Return ONLY a JSON object with exactly these keys:
{
  "company": string,      // hiring organisation, "" if unknown
  "title": string,        // job role, e.g. "Management Trainee", NOT the company
  "location": string,
  "salary": string,       // keep original wording, e.g. "25,000 - 35,000 BDT"
  "currency": string,     // BDT, USD, ... "" if unclear
  "job_type": string,     // full-time | internship | part-time | contract | remote | ""
  "source": string,       // bdjobs | linkedin | facebook | email | referral | other | ""
  "deadline": string,     // YYYY-MM-DD, "" if absent
  "description": string,  // 1-3 sentence English summary, max 400 chars
  "contacts": [ { "name": string, "role": string, "email": string, "phone": string } ],
  "confidence": {         // your own 0-1 confidence per field
    "company": number, "title": number, "location": number,
    "salary": number, "deadline": number, "job_type": number, "source": number
  }
}

Rules:
- Never invent facts. Missing value = "".
- Convert dates like "5 Nov 2026" or "০৫/১১/২০২৬" to YYYY-MM-DD.
  If no year is given, assume the nearest upcoming year.
- Be honest in "confidence"; use low values when guessing (especially salary/deadline).
- No markdown, no commentary, JSON only.`;

// ─────────────────────────────────────────────────────────────
//  Public entry point
// ─────────────────────────────────────────────────────────────

export type ParseInput = {
  url?: string;
  title?: string;
  text?: string;
  image?: { mime: string; data: string };
};

export type ParseResult = {
  draft: Draft;
  engine: string;
  /** Short, human message shown in the extension / form. */
  warning?: string;
  /** Raw technical reason, for the settings page and debugging only. */
  warningDetail?: string;
};

export function emptyDraft(): Draft {
  return {
    company: "",
    title: "",
    location: "",
    salary: "",
    currency: "BDT",
    job_type: "",
    source: "",
    deadline: "",
    description: "",
    contacts: [],
    confidence: {},
  };
}

export async function parseJob(input: ParseInput): Promise<ParseResult> {
  const text = (input.text ?? "").trim();
  const providers = configuredProviders();

  const isSocial = /facebook|instagram|t\.me|telegram|fb\.com/i.test(
    input.url ?? ""
  );
  const vision = Boolean(input.image) && (text.length < 400 || isSocial);

  if (providers.length > 0) {
    const errors: string[] = [];

    for (const provider of providers) {
      try {
        const draft = await callProvider(provider, input, vision);
        return { draft, engine: `${provider.id}:${vision ? "vision" : "text"}` };
      } catch (err) {
        const message = (err instanceof Error ? err.message : "unknown error").slice(0, 160);
        errors.push(`${provider.label}: ${message}`);
      }
    }

    return {
      draft: heuristicParse(input),
      engine: "heuristic",
      warning:
        "AI couldn't be reached, so these fields came from the built-in offline parser. Please check each one before saving.",
      warningDetail: errors.join(" · ").slice(0, 400),
    };
  }

  return {
    draft: heuristicParse(input),
    engine: "heuristic",
    warning:
      "AI isn't set up yet, so these fields came from the built-in offline parser. Please check each one before saving.",
    warningDetail:
      "No AI key configured. Add OPENROUTER_API_KEY or GROQ_API_KEY (both free) to .env.local.",
  };
}

// ─────────────────────────────────────────────────────────────
//  OpenAI-compatible call
// ─────────────────────────────────────────────────────────────

async function callProvider(
  provider: ProviderConfig,
  input: ParseInput,
  vision: boolean
): Promise<Draft> {
  const errors: { model: string; message: string }[] = [];

  for (const model of provider.models) {
    try {
      return await callModel(provider, model, input, vision);
    } catch (err) {
      const message = (err instanceof Error ? err.message : "unknown error").slice(
        0,
        140
      );
      errors.push({ model, message });
      // A bad key will fail on every model — stop early.
      if (/HTTP 401\b/.test(message)) break;
    }
  }

  const unique = [...new Set(errors.map((e) => e.message))];
  const detail =
    unique.length === 1
      ? unique[0]
      : errors.map((e) => `${e.model}: ${e.message}`).join(" | ");
  throw new Error(detail || "no model available");
}

async function callModel(
  provider: ProviderConfig,
  model: string,
  input: ParseInput,
  vision: boolean
): Promise<Draft> {
  const header = [
    input.url ? `Page URL: ${input.url}` : "",
    input.title ? `Page title: ${input.title}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const textBlock = [
    header,
    input.text?.trim()
      ? `Job posting text:\n"""\n${input.text.slice(0, 12000)}\n"""`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!textBlock && !input.image) throw new Error("nothing to parse");

  const userContent = vision && input.image
    ? [
        {
          type: "text" as const,
          text:
            textBlock ||
            "Extract the job posting from this screenshot. Ignore UI chrome.",
        },
        {
          type: "image_url" as const,
          image_url: { url: `data:${input.image.mime};base64,${input.image.data}` },
        },
      ]
    : textBlock || "Extract the job posting from this screenshot.";

  const body: Record<string, unknown> = {
    model,
    temperature: 0.1,
    max_tokens: 1400,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  };

  if (provider.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  let res = await request(provider, body);

  // Some gateways reject response_format — retry once without it.
  if (res.status === 400 && provider.supportsJsonMode) {
    delete body.response_format;
    res = await request(provider, body);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${cleanError(detail)}`.trim());
  }

  const json = await res.json();
  const raw: string =
    json?.choices?.[0]?.message?.content?.trim() ??
    json?.choices?.[0]?.message?.reasoning?.trim() ??
    "";

  if (!raw) throw new Error("empty response");

  return normalizeDraft(extractJson(raw), input);
}

async function request(
  provider: ProviderConfig,
  body: Record<string, unknown>
): Promise<Response> {
  return fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
      ...(provider.id === "openrouter"
        ? {
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "JobDesk",
          }
        : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
}

function cleanError(raw: string): string {
  const tidy = (v: string) => v.replace(/\s+/g, " ").trim().slice(0, 200);
  try {
    const parsed = JSON.parse(raw);
    const msg =
      parsed?.error?.message ?? parsed?.message ?? parsed?.error ?? raw;
    return tidy(String(msg));
  } catch {
    return tidy(raw);
  }
}

function extractJson(raw: string): Record<string, unknown> {
  const trimmed = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("AI returned no JSON");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

// ─────────────────────────────────────────────────────────────
//  Offline fallback — no API key needed
// ─────────────────────────────────────────────────────────────

/** Page titles end with the site name: "Role | Company | LinkedIn". */
const SITE_NAMES =
  /^(bdjobs(\.com)?|linkedin|facebook|indeed|glassdoor|jobs?|job circular|log ?in.*|sign ?up.*)$/i;

/** Words that usually mean "this line is the employer". */
const ORG_RE =
  /\b(ltd|limited|group|corporation|corp|inc|plc|technologies?|solutions?|industries|enterprises?|bank|pharma(ceuticals)?|textiles|foods?|trading|services|systems|software|agency|foundation|university|hospital)\b\.?/i;

// ─────────────────────────────────────────────────────────────
//  Deadline hunting — the date is often on the line *after* the label
// ─────────────────────────────────────────────────────────────

const DEADLINE_LABEL =
  /(deadline|last date|apply before|apply by|apply within|closing date|last day|expire|শেষ তারিখ|আবেদনের|আবেদন)/i;

function findDeadline(lines: string[], flat: string): string {
  // 1. Label line, then the two lines after it (labels are usually alone).
  for (let i = 0; i < lines.length; i++) {
    if (!DEADLINE_LABEL.test(lines[i])) continue;
    const window = [lines[i], lines[i + 1] ?? "", lines[i + 2] ?? ""].join(" ");
    const iso = toIsoDate(window);
    if (iso) return iso;
  }

  // 2. "Apply within 10 days"
  const within = flat.match(/within\s+(\d{1,2})\s*days?/i);
  if (within) {
    const d = new Date();
    d.setDate(d.getDate() + Number(within[1]));
    const iso = assemble(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (iso) return iso;
  }

  // 3. Any date on the page — prefer one that has not passed yet.
  const candidates =
    flat.match(
      new RegExp(
        `20\\d{2}-\\d{1,2}-\\d{1,2}|\\b\\d{1,2}[/.\\-]\\d{1,2}[/.\\-]\\d{2,4}\\b|\\b\\d{1,2}(?:st|nd|rd|th)?[\\s\\-]+${MONTH_TOKEN}\\.?,?[\\s\\-]+\\d{2,4}\\b|\\b${MONTH_TOKEN}\\.?[\\s\\-]+\\d{1,2},?[\\s\\-]+\\d{2,4}\\b`,
        "gi"
      )
    ) ?? [];

  const today = new Date();
  const todayIso = assemble(today.getFullYear(), today.getMonth() + 1, today.getDate());

  for (const candidate of candidates) {
    const iso = toIsoDate(candidate);
    if (iso && todayIso && iso >= todayIso) return iso;
  }

  return "";
}

export function heuristicParse(input: ParseInput): Draft {
  const text = (input.text ?? "").replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const flat = text.replace(/\s+/g, " ");

  const draft = emptyDraft();
  draft.source = sourceFromUrl(input.url);
  const cleanedTitle = cleanTitle(input.title);
  draft.title = SITE_NAMES.test(cleanedTitle) ? "" : cleanedTitle;

  const emailMatch = flat.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/);
  const phoneMatch = flat.match(/(?:\+?880|0)1[3-9]\d{8}/);

  const salaryLine = flat.match(
    /(?:salary|consolidated|stipend|remuneration|বেতন)\s*[:\-–]?\s*((?:BDT|Tk\.?|৳|টাকা)?\s*[\d০-৯,]{3,}(?:\s*(?:-|–|to)\s*[\d০-৯,]{3,})?\s*(?:BDT|Tk\.?|৳|টাকা)?(?:\s*(?:per month|\/month|monthly))?)/i
  );
  if (salaryLine) {
    draft.salary = salaryLine[1].replace(/\s+/g, " ").trim().slice(0, 120);
  } else {
    const money = flat.match(
      /(?:BDT|Tk\.?|৳|টাকা)\s*[\d০-৯,]{3,}(?:\s*(?:-|–|to)\s*[\d০-৯,]{3,})?/i
    );
    if (money) draft.salary = money[0].trim().slice(0, 120);
  }

  draft.deadline = findDeadline(lines, flat);

  if (/intern(ship)?\b/i.test(flat)) draft.job_type = "internship";
  else if (/\bpart[- ]time\b/i.test(flat)) draft.job_type = "part-time";
  else if (/\bcontract(ual)?\b/i.test(flat)) draft.job_type = "contract";
  else if (/\bremote\b/i.test(flat)) draft.job_type = "remote";
  else if (/\bfull[- ]time\b/i.test(flat)) draft.job_type = "full-time";

  const locLabel = text.match(
    /(?:job\s+)?location\s*[:\-–]\s*([^\n]{2,60})/i
  );
  if (locLabel) {
    draft.location = locLabel[1]
      .split(/[.;|]/)[0]
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  } else if (/\bdhaka\b/i.test(flat)) draft.location = "Dhaka";

  const companyLine = lines.find((l) =>
    /(company|organization|organisation|employer)\s*[:\-]/i.test(l)
  );
  if (companyLine) {
    draft.company = companyLine
      .split(/[:\-]/)
      .slice(1)
      .join("-")
      .trim()
      .slice(0, 80);
  }

  // Fall back to the page title: "Role | Company | LinkedIn" → "Company"
  if (!draft.company) {
    const parts = (input.title ?? "")
      .split(/[|–—]/)
      .map((p) => p.trim())
      .filter(
        (p) =>
          p &&
          !SITE_NAMES.test(p) &&
          p.toLowerCase() !== draft.title.toLowerCase()
      );
    if (parts.length > 0) draft.company = parts[0].slice(0, 80);
  }

  // Last resort: a short line that looks like an organisation name.
  if (!draft.company) {
    const org = lines.find(
      (l) =>
        l.length <= 70 &&
        l.split(/\s+/).length <= 8 &&
        ORG_RE.test(l) &&
        !/[:@]/.test(l) &&
        !/\.\s/.test(l)
    );
    if (org) draft.company = org.slice(0, 80);
  }

  // Social posts: "We are hiring an HR Officer at PRAN Group."
  if (!draft.company) {
    const at = flat.match(
      /\b(?:at|@)\s+([A-Z][A-Za-z&.'\- ]{2,40}?)(?=[.,;:!?]|\s+(?:is|for|in|with|and)\b|$)/
    );
    if (at) draft.company = at[1].trim().slice(0, 80);
  }

  // Most pages have no blank lines, so look for the longest real sentence.
  const sentence = lines
    .filter(
      (l) =>
        l.length >= 60 &&
        l.length <= 400 &&
        !SITE_NAMES.test(l) &&
        !/^(home|jobs|categories|sign ?in|log ?in|skip to)/i.test(l)
    )
    .sort((a, b) => b.length - a.length)[0];

  let summary = "";
  if (sentence) {
    const next = lines[lines.indexOf(sentence) + 1] ?? "";
    summary =
      next.length > 20 && next.length < 200 && !SITE_NAMES.test(next)
        ? `${sentence} ${next}`
        : sentence;
  }

  draft.description = (summary || lines.slice(0, 3).join(" ")).slice(0, 300);

  if (emailMatch || phoneMatch) {
    draft.contacts = [
      {
        name: "",
        role: "",
        email: emailMatch?.[0] ?? "",
        phone: phoneMatch?.[0] ?? "",
      },
    ];
  }

  draft.confidence = {
    company: draft.company ? 0.5 : 0,
    title: draft.title ? 0.4 : 0,
    location: draft.location ? 0.4 : 0,
    salary: draft.salary ? 0.3 : 0,
    deadline: draft.deadline ? 0.4 : 0,
    job_type: draft.job_type ? 0.3 : 0,
    source: draft.source ? 0.8 : 0,
  };

  return draft;
}

function normalizeDraft(
  raw: Record<string, unknown>,
  input: ParseInput
): Draft {
  const d = emptyDraft();
  const s = (key: string, max = 200) =>
    typeof raw[key] === "string" ? (raw[key] as string).trim().slice(0, max) : "";

  d.company = s("company", 120);
  d.title = s("title", 160) || cleanTitle(input.title);
  d.location = s("location", 120);
  d.salary = s("salary", 160);
  d.currency = s("currency", 8) || "BDT";
  d.deadline = toIsoDate(s("deadline", 40)) ?? "";
  d.description = s("description", 600);

  const jt = s("job_type", 30).toLowerCase();
  d.job_type = ["full-time", "internship", "part-time", "contract", "remote"].includes(jt)
    ? jt
    : "";

  const src = s("source", 30).toLowerCase();
  d.source = ["bdjobs", "linkedin", "facebook", "email", "referral", "other"].includes(src)
    ? src
    : sourceFromUrl(input.url);

  if (Array.isArray(raw.contacts)) {
    d.contacts = (raw.contacts as Record<string, unknown>[])
      .slice(0, 4)
      .map((c) => ({
        name: typeof c.name === "string" ? c.name.slice(0, 80) : "",
        role: typeof c.role === "string" ? c.role.slice(0, 80) : "",
        email: typeof c.email === "string" ? c.email.slice(0, 120) : "",
        phone: typeof c.phone === "string" ? c.phone.slice(0, 40) : "",
      }))
      .filter((c) => c.name || c.email || c.phone);
  }

  const conf = (raw.confidence ?? {}) as Record<string, unknown>;
  d.confidence = Object.fromEntries(
    Object.keys(conf)
      .filter((k) => typeof conf[k] === "number")
      .map((k) => [k, Math.max(0, Math.min(1, conf[k] as number))])
  );

  return d;
}

function cleanTitle(title?: string): string {
  if (!title) return "";
  const cleaned = title
    .replace(
      /\s*[|\-–—]\s*(bdjobs\.com|linkedin|facebook|job circular|jobs?)\s*$/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  // "Role | Company" → "Role" (pipe/em-dash only, so "Senior Executive - Accounts" survives)
  const head = cleaned.split(/\s*[|–—]\s*/)[0]?.trim() ?? cleaned;
  return (head.length >= 4 ? head : cleaned).slice(0, 160);
}
export function sourceFromUrl(url?: string): string {
  if (!url) return "";
  const u = url.toLowerCase();
  if (u.includes("bdjobs")) return "bdjobs";
  if (u.includes("linkedin")) return "linkedin";
  if (u.includes("facebook") || u.includes("fb.com") || u.includes("fb.watch"))
    return "facebook";
  if (u.startsWith("mailto:") || u.includes("mail.google")) return "email";
  return "other";
}

const MONTHS: Record<string, number> = {
  // English
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
  // Bangla
  "জানুয়ারি": 1, "জানুয়ারী": 1,
  "ফেব্রুয়ারি": 2, "ফেব্রুয়ারী": 2,
  "মার্চ": 3,
  "এপ্রিল": 4,
  "মে": 5,
  "জুন": 6,
  "জুলাই": 7,
  "আগস্ট": 8,
  "সেপ্টেম্বর": 9,
  "অক্টোবর": 10,
  "নভেম্বর": 11,
  "ডিসেম্বর": 12,
};

/** English or Bangla month word. */
const MONTH_TOKEN = "[A-Za-z\\u0980-\\u09FF]{3,12}";

function assemble(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 2000 || year > 2100) return null;
  return `${year}-${pad(String(month))}-${pad(String(day))}`;
}

function fullYear(raw: string): number {
  const n = Number(raw);
  return raw.length === 4 ? n : n < 70 ? 2000 + n : 1900 + n;
}

/** No year given → nearest upcoming occurrence of that day/month. */
function upcoming(month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const now = new Date();
  let year = now.getFullYear();
  if (new Date(year, month - 1, day).getTime() < now.getTime() - 86_400_000) {
    year += 1;
  }
  return assemble(year, month, day);
}

export function toIsoDate(input?: string | null): string | null {
  if (!input) return null;

  const text = String(input)
    .replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6))
    .replace(/\s+/g, " ")
    .trim();

  // 2026-11-05
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return assemble(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // 05/11/2026 · 05-11-26 · 05.11.2026
  const dmy = text.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/);
  if (dmy) {
    const parsed = assemble(fullYear(dmy[3]), Number(dmy[2]), Number(dmy[1]));
    if (parsed) return parsed;
  }

  // 5 Nov 2026 · 5th November, 2026 · ০৫ নভেম্বর ২০২৬ · 5-Nov-26
  const dayFirst = text.match(
    new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-]+(${MONTH_TOKEN})\\.?,?[\\s\\-]+(\\d{2,4})\\b`,
      "i"
    )
  );
  if (dayFirst) {
    const month = MONTHS[dayFirst[2].toLowerCase()];
    if (month) {
      const parsed = assemble(fullYear(dayFirst[3]), month, Number(dayFirst[1]));
      if (parsed) return parsed;
    }
  }

  // November 5, 2026
  const monthFirst = text.match(
    new RegExp(
      `\\b(${MONTH_TOKEN})\\.?[\\s\\-]+(\\d{1,2})(?:st|nd|rd|th)?,?[\\s\\-]+(\\d{2,4})\\b`,
      "i"
    )
  );
  if (monthFirst) {
    const month = MONTHS[monthFirst[1].toLowerCase()];
    if (month) {
      const parsed = assemble(fullYear(monthFirst[3]), month, Number(monthFirst[2]));
      if (parsed) return parsed;
    }
  }

  // No year at all: "5 Nov" / "Nov 5" → nearest upcoming
  const dayMonth = text.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-]+(${MONTH_TOKEN})\\b`, "i")
  );
  if (dayMonth) {
    const month = MONTHS[dayMonth[2].toLowerCase()];
    if (month) return upcoming(month, Number(dayMonth[1]));
  }

  const monthDay = text.match(
    new RegExp(`\\b(${MONTH_TOKEN})\\.?[\\s\\-]+(\\d{1,2})\\b`, "i")
  );
  if (monthDay) {
    const month = MONTHS[monthDay[1].toLowerCase()];
    if (month) return upcoming(month, Number(monthDay[2]));
  }

  return null;
}

function pad(v: string): string {
  return v.length === 1 ? `0${v}` : v;
}
