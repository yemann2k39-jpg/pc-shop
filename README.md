# PC Shop

A full-stack PC-parts store where compatibility, power draw and FPS estimates
are computed live while you build your PC in 3D.

Pick your parts, spin the rig, and watch the numbers change. A rules engine
catches incompatible builds on every selection, performance estimates come
from real published benchmarks instead of marketing numbers, checkout runs
through a swappable payment gateway, and a shopping assistant answers
questions with real products and real prices from the catalog.

## Features

- **3D build viewer.** Every selected part renders as a GLB model inside the
  case in a react-three-fiber scene with orbit controls.
- **Benchmark-grounded FPS estimates.** Per-GPU per-resolution averages from
  TechPowerUp combined with CPU gaming ceilings from GPUCheck through a
  min(GPU, CPU cap) model. If a powerful GPU is paired with a weak CPU, the
  UI says so instead of hiding the bottleneck.
- **Live compatibility checks.** 12 rules covering sockets, DDR4/DDR5, PSU
  headroom, GPU clearance, cooler height and more run in the browser on every
  selection. Incompatible picks turn red with a plain-English explanation.
  The same functions also power the assistant's tools, so client and server
  cannot drift apart.
- **Catalog-grounded shopping assistant.** A chat that works with any
  OpenAI-compatible endpoint (Groq's free tier in development). It has four
  tools: product search, product details, compatibility checking and build
  performance estimation. It is only allowed to state specs, prices and
  compatibility claims that came from a tool result, and it links to real
  product pages.
- **Swappable payment gateway.** Checkout is written once against a small
  provider interface and works unchanged across three backends: a custom
  MiniPay gateway (hosted checkout with HMAC-SHA256 signed webhooks), Stripe
  test mode, and a local mock gateway. Webhooks verify signatures over the
  raw request body and move orders from pending to paid with a
  compare-and-set guard, so retried callbacks cannot resolve an order twice.
- **Full commerce stack.** Cart, checkout with server-side re-pricing (the
  client's prices are never trusted), discount codes with product scoping and
  redemption caps, customer accounts with scrypt-hashed passwords and
  revocable server-side sessions, an admin dashboard for products, orders and
  discounts, and community builds shareable by public link.

## Tech stack

| Layer     | Choices                                                              |
| --------- | -------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, RSC, Server Actions), React 19, TypeScript   |
| Styling   | Tailwind CSS v4, zinc monochrome palette                             |
| 3D        | react-three-fiber, drei, Three.js (GLB part models)                  |
| Data      | SQLite (better-sqlite3), Drizzle ORM with generated migrations       |
| Payments  | MiniPay gateway, Stripe Checkout (test mode), local mock             |
| Assistant | OpenAI-compatible chat completions with tool calling (Groq in dev)   |
| Security  | node:crypto (scrypt, HMAC-SHA256, timingSafeEqual), httpOnly cookies |

## How it is put together

```
src/
  app/
    (shop)/        catalog, category, product, search, cart, checkout,
                   order, account, build (3D builder), builds (community)
    (auth)/        login / signup (server actions)
    admin/         single-admin dashboard (products, orders, discounts)
    api/           checkout, builds, ai/chat, discounts, mock-pay
    minipay/       callback/        HMAC-verified payment webhook
  components/      client islands: 3D viewer, builder, cart, AI assistant
  lib/             pure business logic: catalog taxonomy, compatibility
                   rules, performance model, orders, discounts, payments, ai
  db/              Drizzle schema (7 tables) and seeds (catalog, benchmarks)
  scripts/         verification: verify-compat, verify-perf, smoke-auth
```

Server components query Drizzle directly for the catalog, order and admin
pages. The builder, 3D viewer, cart and assistant are client islands. All
business logic lives in pure modules under `lib/` and is shared by the
browser and the assistant's server-side tools.

## Getting started

Prerequisites: Node.js 20.9+ and pnpm 12+.

```bash
pnpm install
cp .env.example .env.local   # fill in what you want, everything is optional
pnpm db:migrate
pnpm db:seed                 # about 100 real components plus benchmark data
pnpm dev
```

Then open http://localhost:3000. The SQLite database lives at
`data/pc-shop.db` (override with `DATABASE_PATH`). The 3D part models under
`public/models/` are curated GLB files, see MODELS.md.

### Environment variables

| Variable                                 | Purpose                                              |
| ---------------------------------------- | ---------------------------------------------------- |
| `STRIPE_SECRET_KEY`                      | Enables Stripe test mode when set                    |
| `MINIPAY_BASE_URL`                       | MiniPay gateway base URL                             |
| `MINIPAY_API_KEY`                        | MiniPay merchant API key (X-API-Key header)          |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`  | Any OpenAI-compatible endpoint, Groq free tier works |
| `ADMIN_PASSWORD`                         | Required for `/admin` (single-admin auth)            |
| `NEXT_PUBLIC_APP_URL`                    | Public base URL used for payment redirects           |

With no payment keys configured, checkout falls back to a local mock payment
page where you can approve or decline the payment. No real money moves in
any mode.

### Database commands

```bash
pnpm db:generate   # generate SQL migrations from the Drizzle schema
pnpm db:migrate    # apply migrations
pnpm db:seed       # seed catalog and benchmark rows
```

## Verification

The verification scripts run against the real seeded database:

```bash
pnpm verify:compat   # known-good and known-bad builds produce expected findings
pnpm verify:perf     # FPS estimates and bottleneck warnings match benchmarks
pnpm smoke-auth      # full scrypt/session account flow
pnpm lint            # ESLint
pnpm build           # production build
```

## Scripts

| Script          | Purpose                                  |
| --------------- | ---------------------------------------- |
| `pnpm dev`      | Start the development server             |
| `pnpm build`    | Create a production build                |
| `pnpm start`    | Serve the production build               |
| `pnpm lint`     | Run ESLint                               |
| `pnpm db:*`     | Migration generation, apply, seed        |
| `pnpm verify:*` | Compatibility and performance checks     |
