import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard, STOCK_STYLES } from "@/components/product-card";
import { FALLBACK_CATEGORY, getCategory } from "@/lib/catalog";
import { formatPrice, formatSpec, formatSpecKey, STOCK_LABELS } from "@/lib/format";
import { getProductBySlug, getSimilarProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

type ProductPageProps = PageProps<"/product/[slug]">;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.brand} ${product.model}`,
    description: `${product.brand} ${product.model} — ${formatPrice(product.priceCents)}`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const category = getCategory(product.category) ?? FALLBACK_CATEGORY;
  const similar = await getSimilarProducts(product);
  const specEntries = Object.entries(product.specs);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-faint">
        <Link href="/" className="text-ink-dim hover:text-ink">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/category/${category.slug}`} className="text-ink-dim hover:text-ink">
          {category.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span aria-current="page" className="font-medium text-ink">
          {product.model}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="relative aspect-[4/3]">
            <Image
              src={product.imageUrl}
              alt={`${product.brand} ${product.model}`}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
              unoptimized
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium tracking-wide text-ink-faint uppercase">
              {product.brand}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
              {product.model}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-ink">
              {formatPrice(product.priceCents)}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STOCK_STYLES[product.stockStatus]}`}
            >
              {STOCK_LABELS[product.stockStatus]}
            </span>
          </div>

          <AddToCartButton
            product={{
              slug: product.slug,
              brand: product.brand,
              model: product.model,
              imageUrl: product.imageUrl,
              priceCents: product.priceCents,
              stockStatus: product.stockStatus,
            }}
          />

          <div className="rounded-xl border border-line bg-surface">
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
              Specifications
            </h2>
            {specEntries.length === 0 ? (
              <p className="px-4 py-3 text-sm text-ink-dim">
                No specifications listed.
              </p>
            ) : (
              <dl className="divide-y divide-line">
                {specEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[40%_60%] gap-2 px-4 py-2.5 text-sm"
                  >
                    <dt className="text-ink-dim">{formatSpecKey(key)}</dt>
                    <dd className="font-medium text-ink">
                      {formatSpec(value, key)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>

      {similar.length > 0 ? (
        <section aria-labelledby="similar-heading" className="mt-12">
          <h2 id="similar-heading" className="mb-4 text-xl font-semibold text-ink">
            Similar {category.name}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((similarProduct) => (
              <ProductCard
                key={similarProduct.id}
                product={similarProduct}
                category={category}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
