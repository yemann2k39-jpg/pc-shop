import { NextResponse } from "next/server";

import { getOrderByNumber, transitionPendingOrder } from "@/lib/orders";

/**
 * Local mock-gateway endpoint: marks a pending order paid or cancelled.
 * Disabled whenever real Stripe keys are configured.
 */
export async function POST(request: Request) {
  if (process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Mock payments are disabled while Stripe is configured" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    orderNumber?: unknown;
    outcome?: unknown;
  } | null;
  if (
    !body ||
    typeof body.orderNumber !== "string" ||
    (body.outcome !== "approve" && body.outcome !== "decline")
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const order = await getOrderByNumber(body.orderNumber);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Compare-and-set against "pending" so concurrent approve/decline cannot
  // flip an already-resolved order.
  const status = body.outcome === "approve" ? "paid" : "cancelled";
  const changed = await transitionPendingOrder(order.orderNumber, status);
  if (!changed) {
    return NextResponse.json({ error: "Order is not awaiting payment" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, status });
}
