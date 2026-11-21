import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getOrderByNumber, transitionPendingOrder } from "@/lib/orders";

/**
 * MiniPay payment callback (webhook).
 *
 * MiniPay POSTs the payment result here with an HMAC-SHA256 signature of
 * the RAW request body, keyed by our API key (merchant-integration.md §5).
 * The raw text is read verbatim — re-serializing JSON would break the HMAC.
 *
 * Idempotent: callbacks can be retried, and the pending -> paid transition
 * is a compare-and-set that no-ops once the order is already resolved.
 */
export async function POST(request: Request) {
  const apiKey = process.env.MINIPAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "MiniPay not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-minipay-signature") ?? "";

  const expected = createHmac("sha256", apiKey).update(rawBody).digest("hex");
  const given = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (
    given.length !== expectedBuf.length ||
    !timingSafeEqual(given, expectedBuf)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    event?: unknown;
    orderRef?: unknown;
    amountMinor?: unknown;
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.event === "checkout.paid" && typeof body.orderRef === "string") {
    const order = await getOrderByNumber(body.orderRef);
    if (!order) {
      // Unknown reference: acknowledge so MiniPay stops retrying, but log it.
      console.error("MiniPay callback for unknown order:", body.orderRef);
      return NextResponse.json({ received: true });
    }
    // Guard against amount tampering: the paid amount must match the order.
    const paidMinor = Number(body.amountMinor);
    const expectedMinor = order.subtotalCents - order.discountCents;
    if (Number.isFinite(paidMinor) && paidMinor !== expectedMinor) {
      console.error(
        `MiniPay amount mismatch for ${body.orderRef}: paid ${paidMinor}, expected ${expectedMinor}`,
      );
      return NextResponse.json({ error: "Amount mismatch" }, { status: 409 });
    }
    // CAS transition: returns false when already resolved (retried callback).
    await transitionPendingOrder(body.orderRef, "paid");
  }

  return NextResponse.json({ received: true });
}
