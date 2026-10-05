import Link from "next/link";

import { CartLink } from "@/components/cart-link";
import { CATEGORIES } from "@/lib/catalog";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-ink">
          PC<span className="text-accent">Shop</span>
        </Link>
        <nav
          aria-label="Product categories"
          className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto text-sm font-medium text-ink-dim"
        >
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="shrink-0 rounded-full px-3 py-1.5 transition-colors hover:bg-raised hover:text-ink"
            >
              {category.name}
            </Link>
          ))}
        </nav>
        <form action="/search" role="search" className="flex shrink-0 items-center gap-1">
          <input
            type="search"
            name="q"
            placeholder="Search parts…"
            aria-label="Search products"
            className="w-36 rounded-full border border-line bg-raised px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none md:w-52"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="rounded-full border border-line px-2.5 py-1.5 text-sm text-ink-dim hover:bg-raised hover:text-ink"
          >
            <span aria-hidden="true">⌕</span>
          </button>
        </form>
        <CartLink />
      </div>
    </header>
  );
}
