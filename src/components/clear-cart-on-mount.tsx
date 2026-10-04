"use client";

import { useEffect } from "react";

import { useCart } from "@/lib/cart-context";

/** Clears the persisted cart once a paid order confirmation is shown. */
export function ClearCartOnMount() {
  const { clear, isLoaded } = useCart();

  useEffect(() => {
    if (isLoaded) clear();
  }, [isLoaded, clear]);

  return null;
}
