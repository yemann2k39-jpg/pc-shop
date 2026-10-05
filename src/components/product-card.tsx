import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/add-to-cart-button";
import type { Product } from "@/db/schema";
import type { CategoryConfig } from "@/lib/catalog";
import { formatPrice, formatSpec, formatSpecKey, STOCK_LABELS } from "@/lib/format";

export const STOCK_STYLES: Record<Product["stockStatus"], string> = {
  in_stock: "border-status-success/25 bg-status-success/10 text-status-success",
  low_stock: "border-status-warning/25 bg-status-warning/10 text-status-warning",
  out_of_stock: "border-line bg-raised text-ink-dim",
};

export function ProductCard({
  product,
  category,
}: {
  product: Product;
  category: CategoryConfig;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-line-strong">
      <Link
        href={`/product/${product.slug}`}
        aria-label={`${product.brand} ${product.model} — ${formatPrice(product.priceCents)}`}
        className="block"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-raised">
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
            <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
              {product.brand}
            </p>
            <h3 className="text-sm leading-snug font-semibold text-ink">
              {product.model}
            </h3>
          </div>
          <ul className="space-y-0.5 text-xs text-ink-dim">
            {category.cardSpecs.map((key) => {
              const value = product.specs[key];
              if (value === undefined) return null;
              return (
                <li key={key}>
                  <span className="text-ink-faint">{formatSpecKey(key)}</span>{" "}
                  {formatSpec(value, key)}
                </li>
              );
            })}
          </ul>
        </div>
      </Link>
      <div className="mt-auto flex items-center justify-between gap-2 p-4 pt-2">
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold text-ink">
            {formatPrice(product.priceCents)}
          </span>
          <span
            className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium ${STOCK_STYLES[product.stockStatus]}`}
          >
            {STOCK_LABELS[product.stockStatus]}
          </span>
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
