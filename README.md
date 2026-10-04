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
pnpm db:seed       # seed the catalog with sample products (lands in TCK-2)
```

### Payments

Checkout uses Stripe Checkout in test mode. Put test keys in a `.env.local`
file (see `.env.example`):

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

No real money moves in test mode.

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
