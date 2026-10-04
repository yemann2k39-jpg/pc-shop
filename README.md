# PC Shop

A PC-parts e-commerce website built with Next.js. Phase 1 is a normal, basic
shop: browse the catalog, view detailed product pages, search and filter, use a
cart, and check out with a test-mode payment. More advanced features
(compatibility checking, performance estimation, an AI assistant) are planned
for later phases and are intentionally out of scope here.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) +
  [Drizzle ORM](https://orm.drizzle.team)
- [Stripe](https://stripe.com) Checkout in **test mode** for payments

## Prerequisites

- Node.js 20.9+ (Next.js 16 requirement)
- pnpm 12+

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database lives at `data/pc-shop.db` (override the location with the
`DATABASE_PATH` environment variable). It is created and seeded when the
catalog lands in the next ticket.

### Database commands

```bash
pnpm db:generate   # generate SQL migrations from the Drizzle schema
pnpm db:migrate    # apply migrations to the local database
pnpm db:seed       # seed the catalog with sample products
```

### Payments

The payment gateway sits behind a thin provider interface
(`src/lib/payments/`) with two implementations:

- **Stripe Checkout (test mode)** — active when `STRIPE_SECRET_KEY` is set in
  `.env.local` (see `.env.example`; keys come from the Stripe dashboard).
- **Mock gateway** — used automatically when no keys are configured. Checkout
  redirects to a local fake payment page (`/checkout/mock`) where you can
  approve or decline the payment. Zero setup required.

Either way, no real money moves.

> **Known trade-off:** in Stripe mode, payment confirmation is verified when
> the customer returns to `/order/[orderNumber]` (session checked server-side).
> A production shop would additionally use a Stripe webhook so
> pay-then-close-the-tab orders still get confirmed — left out of phase 1 to
> avoid requiring a public webhook endpoint.

## Scripts

| Script           | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | Start the development server               |
| `pnpm build`     | Create a production build                  |
| `pnpm start`     | Serve the production build                 |
| `pnpm lint`      | Run ESLint                                 |
| `pnpm db:*`      | Database generation / migration / seeding  |

## Development workflow

This project uses a ticket-driven workflow (`.tickets/` database, managed via
the `tickets` CLI). Each feature lands as a reviewed, committed ticket.
