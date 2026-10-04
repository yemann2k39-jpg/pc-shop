import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orders } from "@/db/schema";

import type { PaymentProvider } from "./types";

/**
 * Zero-setup fallback used when STRIPE_SECRET_KEY is not configured.
 * Renders a local fake payment page (/checkout/mock) so the full
 * checkout → payment → confirmation flow runs without external accounts.
 */
export function createMockProvider(appUrl: string): PaymentProvider {
  return {
    name: "mock",

    async createCheckout({ order }) {
      return {
        url: `${appUrl}/checkout/mock?order=${encodeURIComponent(order.orderNumber)}`,
        sessionId: `mock_${order.orderNumber}`,
      };
    },

    async isSessionPaid(sessionId) {
      // The mock page marks the order via /api/mock-pay; the DB is the truth.
      const [order] = await db
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.paymentSessionId, sessionId))
        .limit(1);
      return order?.status === "paid";
    },
  };
}
