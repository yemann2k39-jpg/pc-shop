# HANDOFF — Admin Dashboard Session

Read this before planning anything. It brings you from zero to productive on
this repo and frames the admin dashboard task.

---

## 1. What this project is

**PC Shop** — a PC-parts e-commerce site with advanced builder tooling, built
as a portfolio-grade demo. Phase 1 (shop + builder + AI) is COMPLETE: 21 of
22 tickets done. The next task agreed with the user is an **admin dashboard**
(this session).

Location: `C:\KuromiLab\pc-shop`
Live during sessions at: `http://localhost:3000` (`pnpm start`, production build)

## 2. Stack & run

- Next.js **16** (App Router, Turbopack) + TypeScript + React 19 + Tailwind v4
- SQLite via **better-sqlite3** + **Drizzle ORM** (file: `data/pc-shop.db`, gitignored)
- Payments: Stripe test mode + a local mock gateway, behind a provider interface
- AI assistant: Groq (`openai/gpt-oss-120b`), OpenAI-compatible via env vars

```bash
pnpm install
pnpm db:migrate     # applies drizzle/ migrations (creates schema)
pnpm db:seed        # 64 realistic products + generated SVG images
pnpm dev            # or: pnpm build && pnpm start
```

Env: copy `.env.example` → `.env.local`. Currently used: `STRIPE_SECRET_KEY`
(optional — mock gateway is the fallback), `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL`
(Groq key is in the user's `.env.local` already — do not commit it).

**Gotchas (learned the hard way):**
- `public/images/**` and `data/` are gitignored — run `pnpm db:seed` after a
  fresh clone or product images are missing.
- Port 3000: a killed `pnpm start` wrapper can leave an orphaned node process
  holding the port. Check `Get-NetTCPConnection -LocalPort 3000` and kill the
  PID before starting a "new" server — otherwise you test a STALE build.
- **PowerShell constrained mode corrupts files** if you bulk-edit with
  `[System.IO.File]::ReadAllText/.Replace/.WriteAllText` (letter substitution
  like t→e, b→g was observed). Use the file edit tools instead.
- Next 16: `params`/`searchParams` in pages are **Promises** (await them).
  Pages that read the DB use `export const dynamic = "force-dynamic"`.

## 3. Where things live

| Path | What it is |
|---|---|
| `src/lib/catalog.ts` | **Single source of truth**: the 8 categories, their identity colors, card specs, filter definitions |
| `src/db/schema.ts` | Tables: `products`, `orders`, `builds` (Drizzle) |
| `src/db/seed.ts` | Sample catalog (64 products, 8/category) + SVG placeholder generation |
| `src/lib/compatibility.ts` | Pure compatibility engine (9 rules, stable rule ids) — no DB access |
| `src/lib/performance.ts` | Curated benchmark indices + FPS estimator (AAA/Esports presets, per-part + whole-build) |
| `src/lib/products.ts` | Catalog queries (list/filter/search/facets) |
| `src/lib/payments/` | PaymentProvider interface + Stripe + mock implementations |
| `src/app/build/` | PC Builder (server page + `build-client.tsx` client component) |
| `src/components/build-viewer.tsx` | 3D viewer (React Three Fiber, code-primitive models — see `MODELS.md`) |
| `src/app/product/[slug]/` | Product detail (specs, performance panel) |
| `src/app/builds/`, `src/app/build/[publicId]/` | Saved builds index + shareable build page |
| `src/lib/builds.ts`, `src/app/api/builds/` | Saved-builds storage/validate/API |
| `src/lib/ai/`, `src/app/api/ai/chat/`, `src/components/ai-assistant.tsx` | Grounded AI assistant (site-wide chat widget) |
| `src/scripts/verify-compat.ts`, `verify-perf.ts` | Engine sanity scripts (`pnpm verify:compat`, `pnpm verify:perf`) |
| `MODELS.md` | 3D model decision record + how to swap in sourced GLBs |

## 4. Data model (what the admin will manage)

- **products**: slug, category (catalog slug), brand, model, priceCents
  (integer!), stockStatus (`in_stock | low_stock | out_of_stock`), imageUrl,
  **specs** — a JSON map whose keys vary per category (e.g. cpu: socket,
  cores, threads, tdpW…; gpu: chipset, vramGB, lengthMm…). Specs are
  filterable (json_extract) and drive the compatibility engine, so the admin
  MUST edit them as structured fields per category (config in
  `catalog.ts` `CategoryFilter`/`cardSpecs`), not free text.
- **orders**: publicId, status (`pending|paid|cancelled`), customer info,
  items JSON snapshot (unitPriceCents), subtotalCents, paymentSessionId.
- **builds**: publicId, name, ownerName, note, items JSON (category → slug —
  re-hydrated at render), createdAt. Saved builds are public pages.

## 5. Conventions & workflow (IMPORTANT)

- **Ticket workflow is active per the user's global AGENTS.md**: new sessions
  start UNTRACKED — when the user says `tkt on` (or `tkt: <request>`), run
  `tickets playbook` (CLI: `node C:\KuromiLab\ai-development-ticket-workflow\dist\cli\cli.js`,
  pass `--root C:\KuromiLab\pc-shop`) and follow it: propose 3–7 tickets →
  user approves → `tickets create-batch` → implement → subagent code review →
  **user tests in the browser → only commit after the user says continue**.
- 21/22 tickets done; **TCK-22 (integrate the user's own payment gateway) is
  deferred until the user supplies its API docs.**
- Commits: `tickets commit --message … --ticket TCK-x --stage-all` (the CLI
  validates that every changed file is linked to a ticket; link files with
  `tickets link TCK-x --file <path>`; `--allow-unlinked` exists for conscious
  exceptions). Lifecycle transitions: backlog → todo → in-progress →
  in-review → done (each step is a separate CLI call; done requires --evidence).
- **The user tests EVERY ticket in the browser before it is committed.** Do
  not commit without their explicit continue.
- After finishing work: rebuild (`pnpm build`) and restart the server so the
  user tests the real thing. Clear port 3000 orphans first (see gotchas).
- Code review subagents: use the efficient GLM flash model per user request.

## 6. The admin dashboard task (this session's goal)

User request, verbatim intent: an **admin dashboard** to manage the shop.
Nothing is designed yet — no ticket exists. Open questions YOU should resolve
with the user before planning:

1. **Auth (blocker — none exists):** the site has no accounts at all. The
   admin area needs at least a single-admin login (password in env + session
   cookie via middleware) — ask the user how serious this should be.
2. **Scope candidates** (propose as tickets): product CRUD (create/edit/
   retire products with per-category structured specs + image upload or
   generated placeholders), order management (list orders, mark shipped/
   refund? orders only come from checkout), builds moderation (delete abuse),
   dashboard stats (revenue from paid orders, stock alerts), category/spec
   management (currently code-level config — changing it is a code change,
   not admin UI; flag this).
3. **Architecture notes:** admin routes should live under `/admin` with
   auth middleware; reuse `src/lib/products.ts` query patterns; DB is
   server-side only (`src/db` is `server-only`); admin mutations should be
   Server Actions or route handlers (see `src/app/api/` for style).
4. **User preferences learned so far:** wants good visual results and will
   iterate (trial-and-error with their feedback); prefers being asked
   questions when data/decisions are needed; commits only after their test.

## 7. Tickets & history

Ticket DB: `.tickets/tickets.db` (CLI: `tickets list`, `tickets standup`).
21 done (TCK-1…TCK-21, see `tickets list`), TCK-22 deferred. Full git history
is in the repo — commits reference ticket keys (TCK-1 … TCK-21).

---

**TL;DR for the new session:** read §2 (run it), §5 (workflow — tickets,
review, user-tests-before-commit), §6 (admin task + the auth question), then
propose a ticket breakdown to the user and wait for approval before coding.
