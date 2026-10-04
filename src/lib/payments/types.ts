import type { Order } from "@/db/schema";

export type CheckoutSession = {
  /** Hosted payment page URL to redirect the customer to. */
  url: string;
  /** Provider-specific session id stored on the order. */
  sessionId: string;
};

/**
 * Thin gateway abstraction so the payment provider can be swapped without
 * touching checkout or order logic. Implementations: Stripe (test mode) and
 * a local mock used when no Stripe keys are configured.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: {
    order: Order;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession>;
  /** True when the customer completed payment for this session. */
  isSessionPaid(sessionId: string): Promise<boolean>;
}
