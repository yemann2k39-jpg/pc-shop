"use client";

import Link from "next/link";

import { useCart } from "@/lib/cart-context";

/** Header cart link with a live item-count badge. */
export function CartLink() {
  const { totalQty, isLoaded } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`Cart${totalQty > 0 ? `, ${totalQty} item${totalQty === 1 ? "" : "s"}` : ""}`}
      className="relative flex shrink-0 items-center rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
        />
      </svg>
      Cart
      {isLoaded && totalQty > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1 text-[11px] font-bold text-white"
        >
          {totalQty > 99 ? "99+" : totalQty}
        </span>
      ) : null}
    </Link>
  );
}
