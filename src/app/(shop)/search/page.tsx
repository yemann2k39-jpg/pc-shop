import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES, type CategoryConfig } from "@/lib/catalog";
import { firstParam, parsePageParam, type RawQuery } from "@/lib/params";
import { listProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Search" };

type SearchPageProps = {
  searchParams: Promise<RawQuery>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const q = (firstParam(query.q) ?? "").trim();
  const page = parsePageParam(firstParam(query.page));

  const result = q ? await listProducts({ query: q, page, perPage: 12 }) : null;

  // Out-of-range pages land on the last page instead of a misleading
  // "Nothing found" state.
  if (result && result.page > result.pageCount) {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (result.pageCount > 1) search.set("page", String(result.pageCount));
    const qs = search.toString();
    redirect(qs ? `/search?${qs}` : "/search");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-zinc-800">Search</span>
      </nav>

      <h1 className="text-2xl font-semibold tracking-tight">
        {q ? (
          <>
            Results for <span className="text-blue-700">“{q}”</span>
          </>
        ) : (
          "Search"
        )}
      </h1>

      {!result ? (
        <>
          <form action="/search" role="search" className="mt-4 flex max-w-md gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search parts…"
              aria-label="Search products"
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Search
            </button>
          </form>
          <p className="mt-3 text-sm text-zinc-500">
            Type a brand, model, or part name — for example “Ryzen” or “RTX”.
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-zinc-500">
            {result.total} {result.total === 1 ? "product" : "products"} found
          </p>

          {result.items.length > 0 ? (
            <>
              <h2 className="sr-only">Search results</h2>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {result.items
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
              <div className="mt-8">
                <Pagination
                  page={result.page}
                  pageCount={result.pageCount}
                  params={{ q }}
                  basePath="/search"
                />
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
              <p className="font-medium text-zinc-700">Nothing found</p>
              <p className="mt-1 text-sm text-zinc-500">
                Check the spelling or try a broader term.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
