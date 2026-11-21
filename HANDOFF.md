# HANDOFF — PC Shop (read this before doing anything)

Complete orientation for a fresh session working on this repo. Everything
below reflects the CURRENT state as of this handoff.

---

## 1. What this project is

**PC Shop** (`C:\KuromiLab\pc-shop`) — a PC-parts e-commerce site with
advanced builder tooling, built as a portfolio-grade demo. Built across three
sessions: (1) shop + builder + performance + saved builds + AI assistant,
(2) admin dashboard (separate session, complete), (3) UI polish pass
(current, uncommitted — see §5).

## 2. Run it

```bash
pnpm install
pnpm db:migrate     # apply drizzle/ migrations (creates all tables)
pnpm db:seed        # 64 products + placeholder SVG images + category tiles
pnpm dev            # or pnpm build && pnpm start
```

- Site at `http://localhost:3000`. Admin at `/admin` (login credentials are
  in the user's `.env.local` — ask them; single-admin auth exists).
- `data/pc-shop.db`, `public/images/**` are gitignored — run `pnpm db:seed`
  after a fresh clone or product images are missing.
- `.env.local` (gitignored, NEVER commit) holds: Stripe test key, Groq API
  key (`AI_API_KEY`), `AI_BASE_URL`, `AI_MODEL`.
- **Port 3000 gotcha:** a killed `pnpm start` wrapper can leave an orphaned
  node process holding the port — you then test a STALE build. Before
  starting: `Get-NetTCPConnection -LocalPort 3000` → kill the PID.

## 3. Stack

Next.js **16** (App Router, Turbopack) + TypeScript + React 19 + Tailwind
v4 · SQLite (better-sqlite3) + Drizzle ORM · Stripe (test mode) + mock
gateway · Groq (`openai/gpt-oss-120b`) for the AI assistant · React Three
Fiber for the builder's 3D view.

Route structure: storefront pages live in the **`(shop)` route group**
(`src/app/(shop)/…`, shares a layout with header/footer/AI widget); the
admin dashboard is `src/app/admin/**` with its own auth (built and committed
in another session — TCK-26…TCK-35: login + middleware, dashboard stats,
product CRUD with structured per-category specs and generated images, order
management, builds moderation, discounts/promotions with codes and checkout
integration, sale prices with compare-at badges). `src/lib/product-image.ts`
is shared between the app and the seed script — do NOT add `server-only` to
it (breaks `pnpm db:seed`).

## 4. Key files

| Path | What it is |
|---|---|
| `src/lib/catalog.ts` | Single source of truth: 8 categories, identity colors, tile classes, card specs, filter definitions |
| `src/db/schema.ts` | `products` (structured JSON **specs**, compareAtCents, popularity), `orders`, `builds`, `discounts` |
| `src/lib/products.ts` | Catalog queries: list/filter/facets/search, best-selling sort (popularity), stock counts |
| `src/lib/compatibility.ts` | Pure compatibility engine (9 rules, stable rule ids, no DB) |
| `src/lib/performance.ts` | Curated benchmark indices + FPS estimator (AAA/Esports presets, per-part + whole-build) |
| `src/lib/payments/` | PaymentProvider interface + Stripe + mock implementations |
| `src/lib/builds.ts`, `src/app/api/builds/` | Saved-builds storage/validation/API |
| `src/components/build-viewer.tsx` | 3D viewer (React Three Fiber, code-primitive part models — see `MODELS.md`) |
| `src/lib/build-scene.ts` | 3D slot anchors inside the case |
| `src/lib/ai/` + `src/app/api/ai/chat/` + `src/components/ai-assistant.tsx` | Grounded AI assistant (tools: catalog search, details, compatibility, performance, compatible-parts finder) |
| `src/scripts/verify-compat.ts`, `verify-perf.ts` | Engine sanity scripts (`pnpm verify:compat`, `pnpm verify:perf`) |
| `src/lib/product-image.ts` | SVG placeholder generator (shared app + seed; no server-only) |
| `HANDOFF.md` | This file |

## 5. Current uncommitted state (IMPORTANT)

There is an **uncommitted UI polish pass** in the working tree (user asked to
hold commits until fully satisfied). It includes: header redesign (Categories
dropdown, prominent black Builder button with wrench-screwdriver icon),
category sort dropdown + Best selling (new `popularity` column, migration
`0005_eager_blonde_phantom`), stock counts on category headers, generalized
category taglines, black CTAs (all former blue buttons → zinc-900),
professional multi-column footer, custom b/w support-agent icon for the AI
chat (`AgentIcon` in `src/components/ai-assistant.tsx`, drawn from a
reference image the user supplied), and an encoding-repair pass.

**First action in a new session:** run `git status`, show the user the
uncommitted pass, and ask whether to commit it (they gate all commits).

## 6. Conventions & workflow (IMPORTANT)

- **Ticket workflow per user's global AGENTS.md:** sessions start UNTRACKED;
  `tkt on` activates tracking. Then: `tickets playbook` → propose 3–7
  tickets → user approves → `tickets create-batch` → implement → subagent
  code review (user asked for the efficient GLM flash model for reviews) →
  **user tests in the browser → commit only on their explicit continue**.
  Ticket CLI: `node C:\KuromiLab\ai-development-ticket-workflow\dist\cli\cli.js
  --root C:\KuromiLab\pc-shop …` (walk the full lifecycle backlog → todo →
  in-progress → in-review → done; done requires --evidence; the CLI validates
  that changed files are linked to tickets).
- **The user tests every ticket in the browser before commit.** Rebuild +
  restart the server for each test round.
- User feedback style: direct, iterates visually, wants good results over
  speed. They may waive reviews for small passes.
- Tickets: 35 created so far (TCK-1…TCK-35 across shop + admin sessions);
  all done except **TCK-22** (user's custom payment gateway — deferred until
  they share its API docs) and the current uncommitted UI polish pass.

## 7. Gotchas (all encountered — do not repeat)

- **PowerShell bulk-edit corruption:** looping `Get-Content -Raw` /
  `Set-Content` / `[System.IO.File]` over source files under this sandbox
  double-encodes UTF-8 (… → â€¦, — → â€”, adds BOM) and can substitute
  letters. Use the file edit tools; if a sweep is unavoidable, run the
  repair pattern from `.model-src/fix-encoding.cjs` afterwards and diff.
- **Orphaned servers:** see port gotcha above. After restarting, verify you
  are serving the CURRENT build (check for a recently-added code marker in
  the served HTML/JS, not just HTTP 200).
- **React comment nodes break HTML substring tests:** `~133–157` renders as
  `~<!-- -->133<!-- -->–…` — assert on single literals, not cross-node
  phrases.
- **PowerShell 5.1 quirks in this sandbox:** no ternary operator, no
  `-AsHashtable`, `-Raw`/`-NoNewline` intermittently unavailable, `$home`
  is reserved. Keep shell scripts simple.
- **Groq model names change:** `llama-3.3-70b-versatile` was retired; list
  models via `GET /openai/v1/models` with the key. Current model:
  `openai/gpt-oss-120b` (needs `reasoning_effort: "low"` and generous
  max_tokens or tool calls get starved).
- **Encoding sweeps:** see `.model-src/fix-encoding.cjs` for the repair map.

## 8. Design language (established through user feedback)

- Light theme only (a dark theme was built and rejected). White surfaces,
  zinc borders/text tiers, **black/zinc-900 filled CTAs** (a blue accent was
  tried and rejected; green branding rejected). Blue only for text links.
- Per-category identity colors exist (catalog `accent`) for home tiles and
  illustrations — keep them subtle.
- Illustrated line-art placeholder images (code-generated SVG, see
  `src/lib/illustrations.ts`) — user rejected raw blocks and gradient
  placeholders; these passed.
- No markdown tables in chat answers; bullets only (the chat renderer is
  deliberately minimal).
- The AI assistant icon is a custom b/w support-agent bust (`AgentIcon`) —
  user-approved direction from their reference image.

## 9. Backlog

- **TCK-22** — integrate the user's own payment gateway (needs their docs).
- Small polish items surface continuously — the user tests and reports.
