# JobDesk

> **Resuming a session?** Read [`PROGRESS.md`](PROGRESS.md) first — it has the current branch, done/remaining work, env status, and known issues.

A personal **job application tracker** with a browser extension that captures any job post —
BDJobs, LinkedIn, a Facebook group screenshot — and files it for you.

- **Dashboard** — how many jobs you're tracking, what needs attention, response rate.
- **Jobs list** — search, filter by status/source, sort by deadline.
- **Board** — drag cards through `Saved → Applied → OA → Interview → Offer`.
- **Timeline** — every status change and note is kept per job.
- **Extension** — one keystroke turns a job post into a tracked entry.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + Storage) ·
Gemini free tier for parsing · Tesseract.js as offline OCR fallback.

---

## 1. Prerequisites

| Need | Why |
|---|---|
| Node.js 20+ | to run the app |
| A Supabase account | database, login, screenshot storage (free) |
| Chrome or Edge | for the extension |
| A Google AI Studio key *(optional)* | much better parsing (free, no card) |

---

## 2. Create the database (≈ 5 minutes)

1. Go to <https://supabase.com/dashboard> → **New project**. Pick any name, set a database
   password (save it), region `Southeast Asia (Singapore)` is closest to Bangladesh.
2. Wait for provisioning, then open **SQL Editor → New query**.
3. Paste the whole contents of [`supabase/schema.sql`](supabase/schema.sql) and press **Run**.
   You should see `Success. No rows returned`.
4. **Authentication → Users → Add user → Create new user**.
   Enter your email + a password, and tick *Auto Confirm User*. This is the only account
   that will exist.
5. **Authentication → Sign In / Providers** → turn **off** *Allow new users to sign up*.
   Now nobody else can create an account.
6. **Project Settings → API** — copy these three values:
   - `Project URL`
   - `anon public` key
   - `service_role` key *(secret — server-side only)*

---

## 3. Configure the app

Copy `.env.example` → `.env.local` and fill it in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

GEMINI_API_KEY=            # optional, free from https://aistudio.google.com/apikey
EXTENSION_TOKEN=           # generate below

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a token for the extension:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output into `EXTENSION_TOKEN`.

Then verify everything at once:

```bash
npm run check
```

It pings Supabase and Gemini and prints exactly what is missing.

---

## 4. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000> → sign in with the Supabase user you created.

> **Bangla note:** `npm install` ekbar e cholbe. Tarpor shudhu `npm run dev`. Server
> bondho korte `Ctrl+C`.

---

## 5. Install the extension

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** → select the `extension` folder inside this project.
4. Right-click the new toolbar icon → **Options**.
5. Paste:
   - **Your JobDesk URL** → `http://localhost:3000`
   - **Extension token** → the value from `EXTENSION_TOKEN` (also shown on your
     **Settings** page)
6. Click **Save & test connection**. It should say `Connected ✓  AI: gemini`.

### Using it

| Action | How |
|---|---|
| Capture the current tab | `Alt+Shift+J`, or click the toolbar icon |
| Capture from a right-click | Right-click the page → *Capture job post to JobDesk* |
| Save | Review the amber (low confidence) fields → **Save to JobDesk** |
| Full edit afterwards | Open the job in the web app |

**What gets captured:** page URL, page title, page text, and a screenshot of the visible tab.
The server picks the cheapest path — text parsing first, AI vision for image-only posts
(Facebook groups), offline OCR if there's no AI key.

---

## 6. Deploy (optional, so you can use it on your phone too)

1. Push the project to GitHub (`.env.local` is gitignored — secrets stay local).
2. <https://vercel.com/new> → import the repo.
3. Add the same environment variables in **Settings → Environment Variables**
   (set `NEXT_PUBLIC_APP_URL` to your Vercel URL).
4. Deploy. Then update the extension's server URL to the Vercel domain.

> Vercel's free tier blocks request bodies above ~4.5 MB. The extension already
> downscales screenshots to WebP before uploading, so this is fine.

---

## How the data model works

```
jobs          one row per job posting (company, role, status, deadline, …)
activities    append-only timeline (status changes, notes)
contacts      recruiter / HR cards
attachments   reserved for extra files
storage.shots private bucket holding the screenshots (served via signed URLs)
```

Every table has Row Level Security: `auth.uid() = user_id`. Even if someone got your anon
key, they can't read your rows.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Login page says "Supabase is not configured" | `.env.local` is missing values — restart `npm run dev` after editing |
| `new row violates row-level security policy` | You skipped `schema.sql`, or you're signed in as a different user |
| Extension says "Could not reach the server" | Dev server not running, or wrong URL in options |
| Extension says `Invalid extension token` | `EXTENSION_TOKEN` in `.env.local` ≠ the token in extension options; restart the server after changing it |
| Screenshots don't appear | `SUPABASE_SERVICE_ROLE_KEY` missing — the bucket is private, signing needs it |
| AI returns empty fields | No `GEMINI_API_KEY`, or the page text was navigation junk. Fill manually — the form is the source of truth |
| Board drag does nothing | Refresh once; the status write happens in the background |

---

## Project layout

```
src/
  app/
    (app)/            signed-in shell: dashboard, jobs, board, settings
    login/            single-user sign-in
    api/parse/        text + image → structured draft (extension + screenshot scanner)
    api/save/         draft → database (token or session auth)
    api/health/       config self-check
    actions.ts        server actions: save, status, notes, contacts, delete
  components/         UI (Sidebar, JobForm, Board, StatusSwitcher, …)
  lib/
    extract.ts        Gemini parser + offline regex fallback
    supabase/         server / browser / admin clients
    storage.ts        screenshot upload + delete
extension/            Manifest V3 Chrome/Edge extension
supabase/schema.sql   run this once
```
