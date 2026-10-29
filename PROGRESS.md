# JobDesk — Progress & Handoff

> **Ei file ta first e poro jodi notun session e resume koro.**
> Last updated: 2026-10-29

---

## 0. TL;DR — kothay achi ekhon

| Item | Value |
|---|---|
| Branch | `redesign/modern-ui` (main er upor 5 commit) |
| Last commit | `01c1eda` style(ui): vercel-style black theme pass |
| Working tree | clean |
| Dev server | `http://localhost:3000` (user manually chalu kore) |
| AI status | **offline** — kono provider key set nei |
| Deploy | ❌ hoy nai (localhost only) |
| Push | ✅ `origin/redesign/modern-ui` e push kora (PR: https://github.com/Rakibulislam-emon/JobPilot/pull/new/redesign/modern-ui) |

**Next immediate step:** user UI review → OpenRouter/Groq key add → push + merge → Vercel deploy.

---

## 1. Project ki

Personal **job application tracker** + browser extension.

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4
- Supabase: Postgres + Auth + private `shots` storage bucket
- shadcn/ui (Base UI flavor) — `button`, `card`, `input`, `label`, `badge`
- Chrome/Edge MV3 extension — page capture → AI parse → save
- AI: OpenAI-compatible chat completions, multi-provider (OpenRouter → Groq), offline regex + Tesseract.js fallback
- Single owner account, RLS `auth.uid() = user_id`

---

## 2. Git history

```
01c1eda  style(ui): vercel-style black theme pass                 ← HEAD (redesign/modern-ui)
7c8ac81  feat(ui): shadcn setup + vercel-style dark palette
26e20d1  redesign: phase 8 polish - migrate settings tokens
b86cfe3  redesign: phase 4-7 jobs list, board, detail, login, popup
04f7f42  redesign: phase 1-3 design tokens, shell, dashboard
0f7c30b  first commit                                            ← main (origin/main)
```

Remote: `https://github.com/Rakibulislam-emon/JobPilot.git`

---

## 3. Ki ki done (feature-wise)

### App
- [x] Supabase schema (`jobs`, `activities`, `contacts`, `attachments`) + RLS + `shots` bucket
- [x] Auth (email/password, single owner), middleware route protection
- [x] Dashboard — stats, needs-attention list, activity timeline, pipeline, sources
- [x] Jobs list — search, status/source filter, sort
- [x] Kanban board — drag & drop status change
- [x] Job detail — meta grid, screenshot viewer (signed URL), contacts, notes, activity timeline
- [x] Job new/edit form — screenshot scanner (AI/OCR), field confidence warnings
- [x] Settings — system health, extension token, provider status
- [x] API: `/api/health`, `/api/parse`, `/api/save`, `/auth/signout`
- [x] Duplicate job guard (same URL/company+title)
- [x] Multi-provider AI parser with per-model fallback
- [x] Deadline parser (English + Bangla months, upcoming-year logic)
- [x] Offline heuristic parser + friendly warning text
- [x] Tesseract.js OCR fallback for screenshots

### Extension (v1.0.1)
- [x] MV3 popup capture (title/company/location/salary/deadline/description)
- [x] Screenshot capture (full page) → upload to `shots`
- [x] Bearer token auth via `EXTENSION_TOKEN`
- [x] Context menu + keyboard shortcut `Alt+Shift+J`
- [x] Options page (app URL + token)
- [x] Dark theme popup matching app

### UI redesign (branch `redesign/modern-ui`)
- [x] Design tokens rewritten — **Vercel-style pure black** `#000` bg, neutral surfaces, teal accent used only as a dot/highlight
- [x] Typography: Geist Sans + Geist Mono (Fraunces serif **dropped** for Vercel-like look), Hind Siliguri for Bangla
- [x] Shell: sidebar (monochrome active state), PageHeader with hairline rule, EmptyState, Section, StatCard
- [x] shadcn/ui installed (`components.json`, `src/lib/utils.ts`, `src/components/ui/*`)
- [x] shadcn components re-themed to our tokens (no shadcn light-theme leakage)
- [x] Login page + form → shadcn `Card`/`Input`/`Label`/`Button`
- [x] Job form → 7 shadcn `Input`s + shadcn `Button`s
- [x] Stale token cleanup (`brand` → `accent`, `ink2` → `surface-2`)
- [x] `next.config.ts` supports `NEXT_DIST_DIR` so build can run while dev server is up

### Verified
- [x] `npx tsc --noEmit` clean
- [x] `NEXT_DIST_DIR=.next-build npm run build` pass
- [x] `/api/health` → `{ ok:true, supabase:true, serviceRole:true, ai:"offline", aiProviders:[], extensionToken:true }`
- [x] Pages 200: `/`, `/jobs`, `/board`, `/login`, `/settings`
- [x] Login page visual check (dark + shadcn card)
- [x] Live API tests earlier: `/api/parse` 200, `/api/save` 200, duplicate guard, screenshot upload

---

## 4. Repo map

```
src/
  app/
    (app)/page.tsx              dashboard
    (app)/jobs/page.tsx         list + filters
    (app)/jobs/[id]/page.tsx    detail
    (app)/jobs/[id]/edit/page.tsx
    (app)/jobs/new/page.tsx
    (app)/board/page.tsx        kanban
    (app)/settings/page.tsx
    api/health/route.ts
    api/parse/route.ts          AI/OCR parse (token auth)
    api/save/route.ts           save + screenshot upload
    auth/signout/route.ts
    login/page.tsx
    globals.css                 design tokens + components + animations
    layout.tsx                  fonts + dark class
  components/
    Board.tsx                   kanban drag/drop (client)
    JobForm.tsx                 capture + form (client)
    LoginForm.tsx               shadcn form (client)
    Shell.tsx                   PageHeader / EmptyState / Section / StatCard
    Sidebar.tsx
    StatusPill.tsx
    StatusSwitcher.tsx
    CopyField.tsx
    ConfirmSubmit.tsx
    Icon.tsx
    ui/                         shadcn: button card input label badge
  lib/
    extract.ts                  AI providers + heuristic parser + deadline parser
    env.ts
    apiAuth.ts                  EXTENSION_TOKEN bearer check
    format.ts                   dates, relative time
    image.ts                    file → dataURL, Tesseract OCR
    storage.ts / supabase/*
    constants.ts                STATUS_ORDER, STATUS_META, SOURCES, JOB_TYPES
    types.ts
extension/
  manifest.json                 v1.0.1, Alt+Shift+J
  background.js
  popup.html / popup.js
  options.html / options.js
  README.md
supabase/schema.sql
scripts/check.mjs               npm run check (provider pings)
```

---

## 5. Environment (`.env.local`)

> Values never commit koro. Status only:

| Key | Status | Note |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SET | project `qqlowoilxwklsrqvftle` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | SET | |
| `SUPABASE_SERVICE_ROLE_KEY` | SET | server-only |
| `EXTENSION_TOKEN` | SET | extension Bearer token |
| `NEXT_PUBLIC_APP_URL` | SET | `http://localhost:3000` |
| `OPENROUTER_API_KEY` | **EMPTY** | ← add korle AI on |
| `OPENROUTER_MODEL` | SET | `openrouter/free` |
| `GROQ_API_KEY` | **EMPTY** | fallback |
| `GROQ_MODEL` | SET | |
| `AI_PROVIDER` | EMPTY | auto-detect |
| `GEMINI_API_KEY` | COMMENTED | 403 "free tier not available for this project" |

**AI on korte:**
1. https://openrouter.ai/keys ba https://console.groq.com/keys → free key
2. `.env.local` e paste
3. Server restart
4. `curl http://localhost:3000/api/health` → `ai` ar `aiProviders` check

---

## 6. Baki kaaj (TODO)

### 🔴 Must-do
- [ ] **AI key add** (OpenRouter ba Groq) → vision/text parse on
- [ ] **Vercel deploy** — GitHub push → Vercel import → env vars → deploy
- [ ] **Extension `NEXT_PUBLIC_APP_URL`** deployed URL e update + reload
- [ ] **Push branch** `git push -u origin redesign/modern-ui` — ✅ done (`6ada9af`)
- [ ] **Merge** `redesign/modern-ui` → `main`

### 🟡 UI
- [ ] User review: dashboard / jobs / board / detail / settings
- [ ] More shadcn: `select`, `textarea`, `dialog` (delete confirm), `sonner` (toast), `dropdown-menu`
- [ ] Settings page → shadcn components (ekhono `.card`/`.btn`)
- [ ] StatusPill → shadcn `Badge` (careful: `.pill` border conflict)
- [ ] Mobile responsiveness pass (375px)
- [ ] Loading/skeleton states

### 🟢 Features
- [ ] **Snip capture** — hybrid full-page + area select (extension)
- [ ] CSV export/import
- [ ] Deadline reminders (email/push)
- [ ] Toast feedback (save/delete)
- [ ] Bulk actions (multi-select)
- [ ] Automated tests (deadline parser, heuristic parser, API)

### 📄 Docs
- [ ] `README.md` update — OpenRouter/Groq (not Gemini), shadcn, new design
- [ ] Extension README shortcut confirm

---

## 7. Known issues / gotchas

1. **Dev server + build conflict** — `next build` ar `next dev` duijon e `.next` e likhe → `MODULE_NOT_FOUND`. Solution: `NEXT_DIST_DIR=.next-build npm run build` (already supported in `next.config.ts`).
2. **Port 3000 busy** — purono dev server process roye gele `next dev` 3001/3002 te chole jay. Check: `netstat -ano | grep LISTENING | grep :300`.
3. **Extension reload** — manifest change er por `chrome://extensions` e reload + `chrome://extensions/shortcuts` e shortcut manually set korte hoy.
4. **shadcn light-theme bug (fixed)** — shadcn init `:root { --background: oklch(1 0 0) }` + `body @apply bg-background` add korechilo, tai app light hoye giyechilo. Ekhon shadcn tokens amader design tokens e map kora, `:root`/`.dark` shadcn block nei.
5. **`.pill` + shadcn Badge** — Badge er `border-transparent` utility `.pill` er border ke override kore. Badge use korle border color explicitly set korte hobe.
6. **`cn` package** — shadcn CLI `cn` npm package (compiled clsx+tailwind-merge) use kore, `clsx`/`tailwind-merge` alada install nei. `src/lib/utils.ts` = `export { cn } from "cn"`.
7. **Tesseract OCR** — first run e language model download hoy (slow). AI key thakle eta lagbe na.

---

## 8. Commands cheat sheet

```bash
# dev
npm run dev

# typecheck
npx tsc --noEmit

# build (dev server chalu thakleo)
NEXT_DIST_DIR=.next-build npm run build

# health
curl http://localhost:3000/api/health

# provider ping
npm run check

# git
git status
git log --oneline -5
git push -u origin redesign/modern-ui
```

---

## 9. Session log

### 2026-10-29 (session 2) — Vercel-style black theme pass
- palette -> pure black `#000`, neutral surfaces (`#0a0a0a`/`#111`/`#171717`), hairline borders, shadows removed
- primary button is now white/inverted (`.btn-primary` + shadcn `Button`)
- `.bg-grid` masked grid + top glow overlay in `layout.tsx`
- **bug fix:** sidebar double-active on `/jobs/new` (both Jobs + Add job lit)
- sidebar active state monochrome (`bg-surface-2`), brand dot smaller
- status pills monochrome (colored dot only) — `STATUS_META.pill`
- board columns neutralised, cards `rounded-lg`, deadline tones -> tokens
- `PageHeader` border-b + tighter type scale, `StatCard` mono numbers
- login page recentred, 360px card, no serif wordmark
- legacy colors (emerald/amber/sky/rose) mapped to `success/warn/info/danger`
- tsc + build pass, commit `01c1eda`

### 2026-10-29 (session 1)
- shadcn init + 5 components install
- `globals.css` puro rewrite: dark neutral palette, Geist typography, shadcn light leak fix
- shadcn ui components amader tokens e customize
- Login + JobForm → shadcn components
- `next.config.ts` e `NEXT_DIST_DIR` support
- `.gitignore`: `.playwright-mcp`, `.next-build`
- Commit `7c8ac81`
- tsc + build pass, pages 200

### 2026-10-28
- UI redesign phase 1–8 (tokens, shell, dashboard, jobs, board, detail, login, popup, settings)
- Extension shortcut `Alt+Shift+J`, manifest v1.0.1
- Deadline parser hardening, offline parser fixes, multi-provider AI
- Commits `04f7f42`, `b86cfe3`, `26e20d1`
- `main` pushed (`0f7c30b`)
