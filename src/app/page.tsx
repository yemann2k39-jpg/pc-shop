import Image from "next/image";
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
        <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-700 uppercase">
          PC Shop
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          PC components, minus the guesswork.
        </h1>
        <p className="max-w-md text-lg text-zinc-600">
          Browse {counts.size > 0 ? "the catalog" : "the upcoming catalog"} by
          category — every part with clear specs and honest pricing.
        </p>
      </section>

      <section aria-labelledby="categories-heading" className="py-6">
        <h2 id="categories-heading" className="mb-4 text-xl font-semibold">
          Shop by category
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="group overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md"
            >
              <div className="flex h-20 items-center justify-center border-b border-zinc-200 bg-zinc-50">
                <Image
                  src={`/images/categories/${category.slug}.svg`}
                  alt=""
                  width={120}
                  height={90}
                  className="h-16 w-auto"
                  unoptimized
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-zinc-900 group-hover:text-emerald-700">
                  {category.name}
                </h3>
                <p className="mt-0.5 text-sm text-zinc-500">{category.tagline}</p>
                <p className="mt-2 text-xs font-medium text-zinc-400">
                  {counts.get(category.slug) ?? 0} products
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {featured.items.length > 0 ? (
        <section aria-labelledby="featured-heading" className="py-6">
          <h2 id="featured-heading" className="mb-4 text-xl font-semibold">
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
