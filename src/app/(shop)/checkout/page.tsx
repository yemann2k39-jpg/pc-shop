"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";

type CustomerForm = {
  name: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

const EMPTY_FORM: CustomerForm = {
  name: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
};

const FIELD_LABELS: Record<keyof CustomerForm, string> = {
  name: "Full name",
  email: "Email address",
  address: "Street address",
  city: "City",
  postalCode: "Postal code",
  country: "Country",
};

export default function CheckoutPage() {
  const { items, isLoaded, subtotalCents, clear } = useCart();
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof CustomerForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          items: items.map((item) => ({ slug: item.slug, qty: item.qty })),
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Checkout failed. Please try again.");
        setSubmitting(false);
        return;
      }
      // Payment happens on the hosted (or mock) payment page; the cart is
      // cleared on the confirmation page once payment is verified.
      window.location.assign(data.url);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  if (isLoaded && items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="font-medium text-zinc-700">Your cart is empty</p>
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
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <form
          onSubmit={handleSubmit}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white p-4"
          aria-label="Checkout details"
        >
          <h2 className="text-sm font-semibold">Contact & shipping</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.keys(FIELD_LABELS) as Array<keyof CustomerForm>).map((field) => (
              <label key={field} className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">{FIELD_LABELS[field]}</span>
                <input
                  type={field === "email" ? "email" : "text"}
                  value={form[field]}
                  onChange={(event) => update(field)(event.target.value)}
                  required
                  autoComplete={
                    field === "email"
                      ? "email"
                      : field === "name"
                        ? "name"
                        : field === "postalCode"
                          ? "postal-code"
                          : field === "address"
                            ? "street-address"
                            : field === "country"
                              ? "country-name"
                              : "address-level2"
                  }
                  className="rounded-md border border-zinc-300 px-3 py-2 focus:border-blue-600 focus:outline-none"
                />
              </label>
            ))}
          </div>

          {error ? (
            <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !isLoaded || items.length === 0}
            className="mt-4 w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Starting payment…" : "Pay now"}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-400">
            Demo shop — payments are in test mode, no real money moves.
          </p>
        </form>

        <aside className="lg:w-80 lg:shrink-0">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Order summary</h2>
            <ul className="mt-3 space-y-3">
              {items.map((item) => (
                <li key={item.slug} className="flex items-center gap-3">
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-50">
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium text-zinc-900">
                      {item.brand} {item.model}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {item.qty} × {formatPrice(item.priceCents)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatPrice(item.priceCents * item.qty)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-zinc-200 pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(subtotalCents)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
