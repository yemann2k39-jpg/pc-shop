import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FilterSidebar } from "@/components/filter-sidebar";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { SortSelect } from "@/components/sort-select";
import { getCategory } from "@/lib/catalog";
import {
  allParams,
  buildCategoryHref,
  firstParam,
  parsePageParam,
  type RawQuery,
} from "@/lib/params";
import {
  getCategoryFacets,
  getCategoryStockCounts,
  listProducts,
  parseProductSort,
  type SpecExactFilter,
  type SpecMinFilter,
} from "@/lib/products";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawQuery>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "Category not found" };
  return { title: category.name, description: category.tagline };
}

/** Translates raw query params into structured filter state for a category. */
function parseFilters(categorySlug: string, query: RawQuery) {
  const category = getCategory(categorySlug);
  if (!category) return null;

  const brands = allParams(query.brand);
  const specExact: SpecExactFilter[] = [];
  const specMin: SpecMinFilter[] = [];
  let activeCount = brands.length;

  for (const filter of category.filters) {
    if (filter.kind === "enum") {
      const value = firstParam(query[filter.key]);
      if (value) {
        specExact.push({ key: filter.key, value });
        activeCount += 1;
      }
    } else {
      const raw = firstParam(query[`min_${filter.key}`]);
      const parsed = Number(raw);
      if (raw !== undefined && raw !== "" && !Number.isNaN(parsed)) {
        specMin.push({ key: filter.key, value: parsed });
        activeCount += 1;
      }
    }
  }

  let priceMin: number | undefined;
  let priceMax: number | undefined;
  const minRaw = firstParam(query.priceMin);
  const maxRaw = firstParam(query.priceMax);
  if (minRaw && !Number.isNaN(Number(minRaw))) {
    priceMin = Math.round(Number(minRaw) * 100);
    activeCount += 1;
  }
  if (maxRaw && !Number.isNaN(Number(maxRaw))) {
    priceMax = Math.round(Number(maxRaw) * 100);
    activeCount += 1;
  }

  return { brands, specExact, specMin, priceMin, priceMax, activeCount };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const category = getCategory(slug);
  if (!category) notFound();

  const sort = parseProductSort(firstParam(query.sort));

  const filters = parseFilters(slug, query);
  if (!filters) notFound();

  const [result, facets, stockCounts] = await Promise.all([
    listProducts({
      category: category.slug,
      sort,
      page: parsePageParam(firstParam(query.page)),
      brands: filters.brands,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      specExact: filters.specExact,
      specMin: filters.specMin,
    }),
    getCategoryFacets(category.slug, category.filters),
    getCategoryStockCounts(category.slug),
  ]);

  // Out-of-range pages (stale links, hand-edited URLs) land on the last page
  // instead of rendering a misleading empty state.
  if (result.page > result.pageCount) {
    redirect(
      buildCategoryHref(category.slug, query, { page: result.pageCount, sort }),
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-zinc-800">{category.name}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {category.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {result.total} {result.total === 1 ? "product" : "products"} ·{" "}
          {stockCounts.inStock} in stock · {stockCounts.outOfStock} out of
          stock
        </p>
        <p className="mt-0.5 text-sm text-zinc-400">{category.tagline}</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <FilterSidebar
            slug={category.slug}
            facets={facets}
            query={query}
            sort={sort}
            activeFilterCount={filters.activeCount}
          />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
            <SortSelect
              slug={category.slug}
              sort={sort}
              params={query}
            />
          </div>

          {result.items.length > 0 ? (
            <>
              <h2 className="sr-only">Products</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((product) => (
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
                  params={query}
                  basePath={`/category/${category.slug}`}
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
              <p className="font-medium text-zinc-700">No products match</p>
              <p className="mt-1 text-sm text-zinc-500">
                {filters.activeCount > 0
                  ? "Try removing some filters."
                  : "This category has no products yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
