"use client";

import { useState } from "react";

import { useCart } from "@/lib/cart-context";

export type BuildCartPart = {
  category: string;
  slug: string;
  brand: string;
  model: string;
  imageUrl: string;
  priceCents: number;
  inStock: boolean;
};

/**
 * Adds every in-stock part of a saved build to the cart in one click.
 * Out-of-stock parts are skipped and reported.
 */
export function AddBuildToCart({ parts }: { parts: BuildCartPart[] }) {
  const { add } = useCart();
  const [added, setAdded] = useState<number | null>(null);

  const available = parts.filter((part) => part.inStock);
  const soldOut = parts.length - available.length;

  const addAll = () => {
    for (const part of available) {
      add({
        slug: part.slug,
        brand: part.brand,
        model: part.model,
        imageUrl: part.imageUrl,
        priceCents: part.priceCents,
      });
    }
    setAdded(available.length);
  };

  if (parts.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={addAll}
        disabled={available.length === 0}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
      >
        {available.length === 0
          ? "Parts unavailable"
          : added !== null
            ? `Added ${added} part${added === 1 ? "" : "s"} to cart ✓`
            : `Add all ${available.length} parts to cart`}
      </button>
      {soldOut > 0 ? (
        <p className="mt-1.5 text-xs text-amber-700">
          {soldOut} out-of-stock {soldOut === 1 ? "part was" : "parts were"} skipped.
        </p>
      ) : null}
    </div>
  );
}
