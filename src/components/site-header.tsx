import Link from "next/link";

import { CATEGORIES } from "@/lib/catalog";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          PC<span className="text-emerald-600">Shop</span>
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
      </div>
    </header>
  );
}
