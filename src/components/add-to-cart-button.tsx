"use client";

import { useEffect, useRef, useState } from "react";

import type { StockStatus } from "@/db/schema";
import { useCart } from "@/lib/cart-context";
import { STOCK_LABELS } from "@/lib/format";

type AddToCartProduct = {
  slug: string;
  brand: string;
  model: string;
  imageUrl: string;
  priceCents: number;
  stockStatus: StockStatus;
};

/**
 * Add-to-cart control. `compact` renders the small listing-page variant;
 * the default renders the large detail-page button.
 */
export function AddToCartButton({
  product,
  compact = false,
}: {
  product: AddToCartProduct;
  compact?: boolean;
}) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const soldOut = product.stockStatus === "out_of_stock";

  const handleAdd = () => {
    if (soldOut) return;
    add({
      slug: product.slug,
      brand: product.brand,
      model: product.model,
      imageUrl: product.imageUrl,
      priceCents: product.priceCents,
    });
    setJustAdded(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setJustAdded(false), 1500);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut}
        aria-label={`Add to cart: ${product.brand} ${product.model}`}
        className={
          soldOut
            ? "cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-400"
            : justAdded
              ? "rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white"
              : "rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
        }
      >
        {soldOut
          ? STOCK_LABELS.out_of_stock
          : justAdded
            ? "Added ✓"
            : "Add to cart"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={soldOut}
      className={
        soldOut
          ? "w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-400 sm:w-auto"
          : justAdded
            ? "w-full rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white sm:w-auto"
            : "w-full rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 sm:w-auto"
      }
    >
      {soldOut ? STOCK_LABELS.out_of_stock : justAdded ? "Added to cart ✓" : "Add to cart"}
    </button>
  );
}
