import Link from "next/link";

import { CATEGORIES } from "@/lib/catalog";

export function SiteFooter() {
  const half = Math.ceil(CATEGORIES.length / 2);
  const shopColumns = [CATEGORIES.slice(0, half), CATEGORIES.slice(half)];

  return (
    <footer className="mt-auto bg-zinc-900 text-zinc-300">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold tracking-tight text-white">
            PC<span className="text-blue-400">Shop</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            PC parts with builder tools that prove your build before you buy —
            compatibility, power draw, and performance estimates included.
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            Demo project. Payments run in test mode — no real orders.
          </p>
        </div>

        <nav aria-label="Shop categories">
          <p className="text-sm font-semibold text-white">Shop</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/category/${category.slug}`}
                  className="text-zinc-400 transition-colors hover:text-white"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Tools">
          <p className="text-sm font-semibold text-white">Tools</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              <Link href="/build" className="text-zinc-400 transition-colors hover:text-white">
                PC Builder
              </Link>
            </li>
            <li>
              <Link href="/builds" className="text-zinc-400 transition-colors hover:text-white">
                Community builds
              </Link>
            </li>
            <li>
              <Link href="/cart" className="text-zinc-400 transition-colors hover:text-white">
                Cart
              </Link>
            </li>
            <li>
              <Link href="/search" className="text-zinc-400 transition-colors hover:text-white">
                Search
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold text-white">Good to know</p>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
            <li>Use the 💬 chat widget for PC advice — it reads our live catalog.</li>
            <li>Every build page includes a compatibility report.</li>
            <li>Checkout runs in test mode: no real money moves.</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} PC Shop</p>
          <p>Built with Next.js, SQLite, and Stripe test mode</p>
        </div>
      </div>
    </footer>
  );
}
