"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MAX_QTY_PER_ITEM, useCart, type CartItem } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";

/**
 * Quantity input with a local draft value so the field is freely editable;
 * valid values commit immediately, invalid ones revert on blur.
 */
function QtyInput({ item }: { item: CartItem }) {
  const { setQty } = useCart();
  const [draft, setDraft] = useState(String(item.qty));

  useEffect(() => {
    setDraft(String(item.qty));
  }, [item.qty]);

  return (
    <input
      type="number"
      min="1"
      max={MAX_QTY_PER_ITEM}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = Number.parseInt(event.target.value, 10);
        if (!Number.isNaN(parsed) && parsed >= 1) {
          setQty(item.slug, parsed);
        }
      }}
      onBlur={() => {
        const parsed = Number.parseInt(draft, 10);
        if (Number.isNaN(parsed)) {
          setDraft(String(item.qty));
          return;
        }
        const clamped = Math.max(1, Math.min(MAX_QTY_PER_ITEM, parsed));
        setQty(item.slug, clamped);
        setDraft(String(clamped));
      }}
      aria-label={`Quantity of ${item.brand} ${item.model}`}
      className="h-8 w-12 rounded-md border border-zinc-300 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

export default function CartPage() {
  const { items, isLoaded, setQty, remove, clear, subtotalCents } = useCart();

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
        <p className="mt-4 text-sm text-zinc-500">Loading your cart…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="font-medium text-zinc-700">Your cart is empty</p>
          <p className="mt-1 text-sm text-zinc-500">
            Browse the catalog and add some parts.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Cart{" "}
          <span className="text-base font-normal text-zinc-500">
            ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
        </h1>
        <button
          type="button"
          onClick={clear}
          className="text-sm font-medium text-zinc-500 hover:text-red-600"
        >
          Clear cart
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <ul className="min-w-0 flex-1 space-y-3">
          {items.map((item) => (
            <li
              key={item.slug}
              className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <Link
                href={`/product/${item.slug}`}
                className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-50"
              >
                <Image
                  src={item.imageUrl}
                  alt={`${item.brand} ${item.model}`}
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                      {item.brand}
                    </p>
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-sm font-semibold text-zinc-900 hover:text-blue-700"
                    >
                      <span className="line-clamp-2">{item.model}</span>
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.slug)}
                    aria-label={`Remove ${item.brand} ${item.model} from cart`}
                    className="shrink-0 text-sm text-zinc-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQty(item.slug, item.qty - 1)}
                      aria-label={`Decrease quantity of ${item.brand} ${item.model}`}
                      className="h-8 w-8 rounded-md border border-zinc-300 text-lg leading-none text-zinc-600 hover:bg-zinc-100"
                    >
                      −
                    </button>
                    <QtyInput item={item} />
                    <button
                      type="button"
                      onClick={() => setQty(item.slug, item.qty + 1)}
                      aria-label={`Increase quantity of ${item.brand} ${item.model}`}
                      className="h-8 w-8 rounded-md border border-zinc-300 text-lg leading-none text-zinc-600 hover:bg-zinc-100"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900">
                      {formatPrice(item.priceCents * item.qty)}
                    </p>
                    {item.qty > 1 ? (
                      <p className="text-xs text-zinc-400">
                        {formatPrice(item.priceCents)} each
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:w-80 lg:shrink-0">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Order summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Subtotal</dt>
                <dd className="font-medium">{formatPrice(subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Shipping</dt>
                <dd className="text-zinc-500">Calculated at checkout</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(subtotalCents)}</dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              className="mt-4 block rounded-lg bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800"
            >
              Proceed to checkout
            </Link>
            <p className="mt-2 text-center text-xs text-zinc-400">
              Demo shop — test payment only.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
