"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Client-side cart persisted to localStorage. Line items store a snapshot of
 * the product (slug, name, image, price) so the cart renders without server
 * round-trips; prices are refreshed server-side again at checkout time.
 */
export type CartItem = {
  slug: string;
  brand: string;
  model: string;
  imageUrl: string;
  priceCents: number;
  qty: number;
};

const STORAGE_KEY = "pc-shop-cart-v1";
export const MAX_QTY_PER_ITEM = 10;

type AddToCartInput = Omit<CartItem, "qty">;

type CartContextValue = {
  items: CartItem[];
  /** False until the persisted cart has been read (avoids SSR mismatch). */
  isLoaded: boolean;
  add: (item: AddToCartInput, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  totalQty: number;
  subtotalCents: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function isValidItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.slug === "string" &&
    typeof item.brand === "string" &&
    typeof item.model === "string" &&
    typeof item.imageUrl === "string" &&
    typeof item.priceCents === "number" &&
    Number.isFinite(item.priceCents) &&
    item.priceCents >= 0 &&
    typeof item.qty === "number" &&
    Number.isInteger(item.qty) &&
    item.qty >= 1
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Dedupe by slug (hand-edited storage could contain repeats) and
          // enforce the qty bounds.
          const bySlug = new Map<string, CartItem>();
          for (const item of parsed.filter(isValidItem)) {
            bySlug.set(item.slug, {
              ...item,
              qty: Math.min(MAX_QTY_PER_ITEM, Math.max(1, item.qty)),
            });
          }
          setItems([...bySlug.values()]);
        }
      }
    } catch {
      // Corrupted storage — start with an empty cart.
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage unavailable (private mode etc.) — cart stays in memory.
    }
  }, [items, isLoaded]);

  const add = useCallback((item: AddToCartInput, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((entry) => entry.slug === item.slug);
      if (existing) {
        return prev.map((entry) =>
          entry.slug === item.slug
            ? { ...entry, qty: Math.min(MAX_QTY_PER_ITEM, entry.qty + qty) }
            : entry,
        );
      }
      return [...prev, { ...item, qty: Math.min(MAX_QTY_PER_ITEM, Math.max(1, qty)) }];
    });
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    setItems((prev) =>
      qty < 1
        ? prev.filter((entry) => entry.slug !== slug)
        : prev.map((entry) =>
            entry.slug === slug
              ? { ...entry, qty: Math.min(MAX_QTY_PER_ITEM, qty) }
              : entry,
          ),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((prev) => prev.filter((entry) => entry.slug !== slug));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
    const subtotalCents = items.reduce(
      (sum, item) => sum + item.qty * item.priceCents,
      0,
    );
    return { items, isLoaded, add, setQty, remove, clear, totalQty, subtotalCents };
  }, [items, isLoaded, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
