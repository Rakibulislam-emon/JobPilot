#!/usr/bin/env node
/**
 * JobDesk setup checker.
 * Reads .env.local and pings Supabase + every AI provider to tell you exactly what works.
 *
 *   npm run check
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const results = [];
function add(level, label, detail = "", fix = "") {
  results.push({ level, label, detail, fix });
}

function parseEnv(path) {
  const out = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[line.slice(0, eq).trim()] = value;
  }
  return out;
}

async function req(url, options = {}, timeout = 20000) {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json */
    }
    return { ok: res.ok, status: res.status, json, text };
  } catch (err) {
    return { ok: false, status: 0, json: null, text: err.message };
  }
}

const AI_PROVIDERS = [
  {
    id: "gemini",
    label: "Gemini",
    keyVar: "GEMINI_API_KEY",
    modelVar: "GEMINI_MODEL",
    model: "gemini-flash-latest",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    hint: "If it says the free tier is unavailable, create a key in a fresh Google Cloud project, or switch to OpenRouter/Groq.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keyVar: "OPENROUTER_API_KEY",
    modelVar: "OPENROUTER_MODEL",
    model: "openrouter/free",
    url: "https://openrouter.ai/api/v1/chat/completions",
    hint: "Free key at https://openrouter.ai/keys (no card needed).",
  },
  {
    id: "groq",
    label: "Groq",
    keyVar: "GROQ_API_KEY",
    modelVar: "GROQ_MODEL",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    url: "https://api.groq.com/openai/v1/chat/completions",
    hint: "Free key at https://console.groq.com/keys (no card needed).",
  },
];

async function main() {
  const envPath = resolve(process.cwd(), ".env.local");
  console.log(`\n${BOLD}JobDesk — setup check${RESET}\n`);

  if (!existsSync(envPath)) {
    console.log(`${RED}✗ .env.local not found${RESET}\n  Copy .env.example to .env.local first.`);
    process.exit(1);
  }

  const env = parseEnv(envPath);
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const service = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const token = env.EXTENSION_TOKEN || "";

  // ── Supabase basics ────────────────────────────────────────
  if (!url) {
    add("fail", "Supabase URL", "empty", "Supabase → Settings → API → Project URL");
  } else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
    add("warn", "Supabase URL", `${url} (unusual shape)`, "Should look like https://abcdefgh.supabase.co");
  } else {
    add("ok", "Supabase URL", url);
  }

  if (!anon) {
    add("fail", "Anon / publishable key", "empty", "Supabase → Settings → API keys");
  } else if (!/^(sb_publishable_|eyJ)/.test(anon)) {
    add("warn", "Anon / publishable key", "unrecognised format", "Should start with sb_publishable_ or eyJ");
  } else {
    add("ok", "Anon / publishable key", `(${anon.length} chars)`);
  }

  if (!service) {
    add("fail", "Service role / secret key", "empty", "Needed for screenshots + extension writes");
  } else if (!/^(sb_secret_|eyJ)/.test(service)) {
    add("warn", "Service role / secret key", "unrecognised format", "Should start with sb_secret_ or eyJ");
  } else if (service === anon) {
    add("fail", "Service role / secret key", "same as the anon key", "They must be different keys");
  } else {
    add("ok", "Service role / secret key", `(${service.length} chars)`);
  }

  if (!token) {
    add("fail", "Extension token", "empty", 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  } else if (token.length < 24 || token === "change-me-to-a-long-random-string") {
    add("fail", "Extension token", "too short / placeholder", "Generate a 64-char hex string");
  } else {
    add("ok", "Extension token", `(${token.length} chars)`);
  }

  // ── Live Supabase ──────────────────────────────────────────
  if (url && anon.length > 20) {
    const health = await req(`${url}/auth/v1/health`, { headers: { apikey: anon } });
    if (health.status === 200) add("ok", "Supabase reachable", "auth service responded");
    else if (health.status === 401 || health.status === 403)
      add("fail", "Supabase reachable", "key rejected", "Re-copy the anon / publishable key");
    else add("fail", "Supabase reachable", health.text.slice(0, 90) || "no response", "Check the URL / project paused?");

    const table = await req(`${url}/rest/v1/jobs?select=id&limit=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    if (table.status === 200) add("ok", "Database schema", "jobs table found");
    else if (
      table.status === 404 ||
      (table.json && String(table.json.code) === "42P01") ||
      /relation .* does not exist/i.test(table.text)
    )
      add("fail", "Database schema", "jobs table missing", "Run supabase/schema.sql in the SQL Editor");
    else add("warn", "Database schema", `unexpected ${table.status}: ${table.text.slice(0, 80)}`);

    if (service.length > 20) {
      const buckets = await req(`${url}/storage/v1/bucket`, {
        headers: { apikey: service, Authorization: `Bearer ${service}` },
      });
      if (buckets.status === 200 && Array.isArray(buckets.json)) {
        if (buckets.json.some((b) => b.id === "shots"))
          add("ok", "Screenshot bucket", 'private "shots" bucket exists');
        else
          add("fail", "Screenshot bucket", '"shots" missing', "Re-run supabase/schema.sql (section 7)");
      } else {
        add("warn", "Screenshot bucket", `could not list buckets (${buckets.status})`);
      }

      const users = await req(`${url}/auth/v1/admin/users?per_page=3`, {
        headers: { apikey: service, Authorization: `Bearer ${service}` },
      });
      if (users.status === 200 && users.json) {
        const count = Array.isArray(users.json.users) ? users.json.users.length : 0;
        if (count === 0)
          add("fail", "Your account", "no users exist yet", "Authentication → Users → Add user (Auto Confirm ON)");
        else if (count > 1)
          add("warn", "Your account", `${count} users found`, "This app assumes one owner account");
        else add("ok", "Your account", users.json.users[0].email || "1 user");
      } else {
        add("warn", "Your account", `could not list users (${users.status})`);
      }
    }
  }

  // ── AI providers: a REAL generation call, not just a key lookup ──
  let working = 0;
  const notes = [];

  for (const p of AI_PROVIDERS) {
    const key = env[p.keyVar] || "";
    const model = env[p.modelVar] || p.model;

    if (!key) {
      add("warn", `${p.label} (${model})`, "not configured", p.hint);
      continue;
    }

    const res = await req(p.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 40,
        temperature: 0,
        messages: [{ role: "user", content: 'Return JSON only: {"ok":true}' }],
        response_format: { type: "json_object" },
      }),
    });

    if (res.ok && res.json?.choices?.[0]?.message?.content) {
      working++;
      add("ok", `${p.label} (${model})`, "generation works");
    } else {
      let msg = res.text.replace(/\s+/g, " ").slice(0, 180);
      try {
        msg = res.json?.error?.message ?? msg;
      } catch {
        /* ignore */
      }
      add("fail", `${p.label} (${model})`, msg || `HTTP ${res.status}`, p.hint);
      notes.push(p.id);
    }
  }

  if (working === 0) {
    add(
      "fail",
      "AI provider",
      "none working — offline regex parser will be used",
      "Add a free OpenRouter or Groq key; both work without a card."
    );
  } else {
    add("ok", "AI provider", `${working} working — the app tries them in order`);
  }

  // ── Print ──────────────────────────────────────────────────
  for (const r of results) {
    const icon =
      r.level === "ok" ? `${GREEN}✓${RESET}` : r.level === "warn" ? `${YELLOW}!${RESET}` : `${RED}✗${RESET}`;
    console.log(`${icon} ${r.label}${r.detail ? ` ${DIM}— ${r.detail}${RESET}` : ""}`);
    if (r.fix && r.level !== "ok") console.log(`   ${DIM}↳ ${r.fix}${RESET}`);
  }

  const fails = results.filter((r) => r.level === "fail").length;
  const warns = results.filter((r) => r.level === "warn").length;

  console.log("");
  if (fails === 0) {
    console.log(`${GREEN}${BOLD}All good.${RESET} Restart the dev server (Ctrl+C → npm run dev), then open http://localhost:3000`);
    if (warns > 0) console.log(`${YELLOW}${warns} warning(s) — the app still works.${RESET}`);
  } else {
    console.log(`${RED}${BOLD}${fails} thing(s) need fixing.${RESET} Follow the ↳ hints, then run ${BOLD}npm run check${RESET} again.`);
    if (warns > 0) console.log(`${YELLOW}${warns} warning(s).${RESET}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("Checker crashed:", err);
  process.exit(1);
});
