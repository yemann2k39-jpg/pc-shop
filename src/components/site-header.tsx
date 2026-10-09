import Link from "next/link";

import { CartLink } from "@/components/cart-link";
import { CATEGORIES } from "@/lib/catalog";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          PC<span className="text-blue-700">Shop</span>
        </Link>
        <Link
          href="/build"
          className="shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Builder
        </Link>
        <Link
          href="/builds"
          className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          Builds
        </Link>
        <nav
          aria-label="Product categories"
          className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto text-sm font-medium text-zinc-600"
        >
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="shrink-0 rounded-full px-3 py-1.5 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
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
            className="w-36 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none md:w-52"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="rounded-full border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            <span aria-hidden="true">⌕</span>
          </button>
        </form>
        <CartLink />
      </div>
    </header>
  );
}
