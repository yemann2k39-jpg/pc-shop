import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/add-to-cart-button";
import type { Product } from "@/db/schema";
import type { CategoryConfig } from "@/lib/catalog";
import { formatPrice, formatSpec, formatSpecKey, isOnSale, percentOff, STOCK_LABELS } from "@/lib/format";

export const STOCK_STYLES: Record<Product["stockStatus"], string> = {
  in_stock: "bg-emerald-50 text-emerald-700 border-emerald-200",
  low_stock: "bg-amber-50 text-amber-700 border-amber-200",
  out_of_stock: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export function ProductCard({
  product,
  category,
}: {
  product: Product;
  category: CategoryConfig;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md">
      <Link
        href={`/product/${product.slug}`}
        aria-label={`${product.brand} ${product.model} — ${formatPrice(product.priceCents)}`}
        className="block"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-50">
          <Image
            src={product.imageUrl}
            alt={`${product.brand} ${product.model}`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        </div>
        <div className="flex flex-col gap-2 p-4 pb-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              {product.brand}
            </p>
            <h3 className="text-sm leading-snug font-semibold text-zinc-900">
              {product.model}
            </h3>
          </div>
          <ul className="space-y-0.5 text-xs text-zinc-600">
            {category.cardSpecs.map((key) => {
              const value = product.specs[key];
              if (value === undefined) return null;
              return (
                <li key={key}>
                  <span className="text-zinc-400">{formatSpecKey(key)}</span>{" "}
                  {formatSpec(value, key)}
                </li>
              );
            })}
          </ul>
        </div>
      </Link>
      <div className="mt-auto flex items-center justify-between gap-2 p-4 pt-2">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className={`text-base font-bold ${isOnSale(product) ? "text-red-600" : "text-zinc-900"}`}>
              {formatPrice(product.priceCents)}
            </span>
            {product.compareAtCents !== null && isOnSale(product) ? (
              <span className="text-xs text-zinc-400 line-through">
                {formatPrice(product.compareAtCents)}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            {percentOff(product) !== null ? (
              <span className="w-fit rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                −{percentOff(product)}%
              </span>
            ) : null}
            <span
              className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium ${STOCK_STYLES[product.stockStatus]}`}
            >
              {STOCK_LABELS[product.stockStatus]}
            </span>
          </div>
        </div>
        <AddToCartButton
          compact
          product={{
            slug: product.slug,
            brand: product.brand,
            model: product.model,
            imageUrl: product.imageUrl,
            priceCents: product.priceCents,
            stockStatus: product.stockStatus,
          }}
        />
      </div>
    </div>
  );
}
