"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { formatPrice } from "@/lib/format";

function MockPaymentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const pay = async (outcome: "approve" | "decline") => {
    setProcessing(true);
    setError(null);
    try {
      const response = await fetch("/api/mock-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, outcome }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Mock payment failed.");
        setProcessing(false);
        return;
      }
      // `paid=1` lets the confirmation page clear the cart (mock flow has no
      // Stripe session_id in its return URL).
      router.push(`/order/${orderNumber}?paid=1`);
    } catch {
      setError("Network error. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
          Mock payment gateway
        </p>
        <h1 className="mt-1 text-xl font-semibold">Test checkout</h1>
        <p className="mt-2 text-sm text-zinc-500">
          No Stripe keys are configured, so this local stand-in simulates the
          hosted payment page.
        </p>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <p className="text-zinc-500">Order</p>
          <p className="font-mono font-semibold text-zinc-900">{orderNumber || "—"}</p>
          <p className="mt-2 text-zinc-500">Card</p>
          <p className="font-mono text-zinc-900">4242 4242 4242 4242</p>
        </div>

        {error ? (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => pay("approve")}
            disabled={processing || !orderNumber}
            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {processing ? "Processing…" : "Approve payment"}
          </button>
          <button
            type="button"
            onClick={() => pay("decline")}
            disabled={processing || !orderNumber}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Simulate declined card
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MockPaymentPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-sm text-zinc-500">Loading…</div>}>
      <MockPaymentInner />
    </Suspense>
  );
}
