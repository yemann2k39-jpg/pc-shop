import type { PaymentProvider } from "./types";

/**
 * MiniPay gateway (see C:\KuromiLab\payment-gateway\docs\merchant-integration.md).
 *
 * Hosted, redirect-based checkout: we create a session with our API key,
 * send the customer to MiniPay's hosted page, and mark the order paid from
 * the signed callback (/minipay/callback) — or by polling, as a fallback.
 * All amounts are integer minor units (SGD 10.00 = 1000).
 */
export function createMinipayProvider(
  apiKey: string,
  baseUrl: string,
  appUrl: string,
): PaymentProvider {
  const callbackUrl = `${appUrl.replace(/\/$/, "")}/minipay/callback`;

  async function minipayFetch(
    path: string,
    init?: RequestInit,
  ): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: response.ok, status: response.status, body };
  }

  function describeStatus(status: number, message: unknown): string {
    const detail = typeof message === "string" ? message : `HTTP ${status}`;
    switch (status) {
      case 401:
        return "MiniPay rejected the API key — check MINIPAY_API_KEY.";
      case 409:
        return "MiniPay: this order reference already exists with a different amount.";
      case 410:
        return "MiniPay: the checkout session expired — start the payment again.";
      default:
        return `MiniPay request failed: ${detail}`;
    }
  }

  return {
    name: "minipay",

    async createCheckout({ order, successUrl }) {
      const totalMinor = order.subtotalCents - order.discountCents;
      const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0);
      const description = `Order #${order.orderNumber} — ${itemCount} item${itemCount === 1 ? "" : "s"}`.slice(0, 280);

      const { ok, status, body } = await minipayFetch("/merchant-api/checkout", {
        method: "POST",
        body: JSON.stringify({
          orderRef: order.orderNumber,
          amountMinor: totalMinor,
          description,
          callbackUrl,
        }),
      });
      if (!ok || typeof body.checkoutUrl !== "string" || typeof body.checkoutId !== "string") {
        throw new Error(describeStatus(status, body.message));
      }
      // After paying on the hosted page, MiniPay links back to our order page.
      const url = `${body.checkoutUrl}?returnUrl=${encodeURIComponent(successUrl)}`;
      return { url, sessionId: body.checkoutId };
    },

    async isSessionPaid(sessionId) {
      const { ok, status, body } = await minipayFetch(
        `/merchant-api/checkout/${encodeURIComponent(sessionId)}`,
      );
      if (!ok) throw new Error(describeStatus(status, body.message));
      return body.status === "PAID";
    },
  };
}
