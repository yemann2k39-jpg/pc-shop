import { NextResponse } from "next/server";

import { validateDiscountCode } from "@/lib/discounts";

/** Validates a discount code against the live cart subtotal. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    subtotalCents?: unknown;
  } | null;

  if (!body || typeof body.code !== "string") {
    return NextResponse.json({ ok: false, reason: "Enter a code." }, { status: 400 });
  }
  const subtotal = Number(body.subtotalCents);
  if (!Number.isInteger(subtotal) || subtotal < 0 || subtotal > 100_000_00) {
    return NextResponse.json({ ok: false, reason: "Invalid cart subtotal." }, { status: 400 });
  }

  const result = await validateDiscountCode(body.code, subtotal);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
