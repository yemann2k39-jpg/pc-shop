import Image from "next/image";
import Link from "next/link";

import type { Product } from "@/db/schema";
import type { CategoryConfig } from "@/lib/catalog";
import { formatPrice, formatSpec, formatSpecKey, STOCK_LABELS } from "@/lib/format";

const STOCK_STYLES: Record<Product["stockStatus"], string> = {
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
    <Link
      href={`/product/${product.slug}`}
      aria-label={`${product.brand} ${product.model} — ${formatPrice(product.priceCents)}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-50">
        <Image
          src={product.imageUrl}
          alt={`${product.brand} ${product.model}`}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          unoptimized
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
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
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-bold text-zinc-900">
            {formatPrice(product.priceCents)}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STOCK_STYLES[product.stockStatus]}`}
          >
            {STOCK_LABELS[product.stockStatus]}
          </span>
        </div>
      </div>
    </Link>
  );
}
