import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { CATEGORIES, type CategoryConfig } from "@/lib/catalog";
import { getCategoryProductCounts, listProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [counts, featured] = await Promise.all([
    getCategoryProductCounts(),
    listProducts({ sort: "price-desc", perPage: 4 }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <section className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="text-xs font-medium tracking-widest text-accent uppercase">
          PC Shop
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl">
          PC components, minus the guesswork.
        </h1>
        <p className="max-w-md text-lg text-ink-dim">
          Browse the catalog by category — every part with clear specs and
          honest pricing.
        </p>
      </section>

      <section aria-labelledby="categories-heading" className="py-6">
        <h2 id="categories-heading" className="mb-4 text-xl font-semibold text-ink">
          Shop by category
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="group overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-line-strong"
            >
              <div className="flex h-20 items-center justify-center border-b border-line bg-raised text-2xl font-bold text-accent">
                {category.name
                  .split(" ")
                  .map((word) => word[0])
                  .join("")}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-ink group-hover:text-accent">
                  {category.name}
                </h3>
                <p className="mt-0.5 text-sm text-ink-dim">{category.tagline}</p>
                <p className="mt-2 text-xs font-medium text-ink-faint">
                  {counts.get(category.slug) ?? 0} products
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {featured.items.length > 0 ? (
        <section aria-labelledby="featured-heading" className="py-6">
          <h2 id="featured-heading" className="mb-4 text-xl font-semibold text-ink">
            Premium picks
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.items
              .map((product) => ({
                product,
                category: CATEGORIES.find((c) => c.slug === product.category),
              }))
              .filter(
                (entry): entry is typeof entry & { category: CategoryConfig } =>
                  entry.category !== undefined,
              )
              .map(({ product, category }) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  category={category}
                />
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
