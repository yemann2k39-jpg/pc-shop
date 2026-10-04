import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { getCategory } from "@/lib/catalog";
import { buildCategoryHref, firstParam, parsePageParam } from "@/lib/params";
import { listProducts, parseProductSort, PRODUCT_SORTS, SORT_LABELS } from "@/lib/products";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "Category not found" };
  return { title: category.name, description: category.tagline };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const category = getCategory(slug);
  if (!category) notFound();

  const currentParams = Object.fromEntries(
    Object.entries(query).map(([key, value]) => [key, firstParam(value)]),
  );
  const sort = parseProductSort(currentParams.sort);

  const result = await listProducts({
    category: category.slug,
    sort,
    page: parsePageParam(currentParams.page),
  });

  // Out-of-range pages (stale links, hand-edited URLs) land on the last page
  // instead of rendering a misleading empty state.
  if (result.page > result.pageCount) {
    redirect(buildCategoryHref(category.slug, currentParams, { page: result.pageCount }));
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

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {category.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {result.total} {result.total === 1 ? "product" : "products"} ·{" "}
            {category.tagline}
          </p>
        </div>
        <div
          role="group"
          aria-label="Sort products"
          className="flex items-center gap-1 text-sm"
        >
          <span className="mr-1 text-zinc-400">Sort:</span>
          {PRODUCT_SORTS.map((value) => (
            <Link
              key={value}
              href={buildCategoryHref(category.slug, currentParams, { sort: value })}
              aria-current={sort === value ? "true" : undefined}
              className={
                sort === value
                  ? "rounded-full bg-zinc-900 px-3 py-1.5 font-medium text-white"
                  : "rounded-full px-3 py-1.5 text-zinc-600 hover:bg-zinc-100"
              }
            >
              {SORT_LABELS[value]}
            </Link>
          ))}
        </div>
      </div>

      {result.items.length > 0 ? (
        <>
          <h2 className="sr-only">Products</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              params={currentParams}
              basePath={`/category/${category.slug}`}
            />
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="font-medium text-zinc-700">No products found</p>
          <p className="mt-1 text-sm text-zinc-500">
            This category has no products yet.
          </p>
        </div>
      )}
    </div>
  );
}
