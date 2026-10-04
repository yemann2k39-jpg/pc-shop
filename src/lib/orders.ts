import { and, eq } from "drizzle-orm";
import { randomInt } from "node:crypto";

import { db } from "@/db";
import { orders, type Order, type OrderStatus } from "@/db/schema";

export async function getOrderByNumber(
  orderNumber: string,
): Promise<Order | undefined> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  return order;
}

/**
 * Moves a pending order to the given status. Returns false when the order
 * was concurrently resolved (compare-and-set against status = "pending").
 */
export async function transitionPendingOrder(
  orderNumber: string,
  status: Exclude<OrderStatus, "pending">,
): Promise<boolean> {
  const result = await db
    .update(orders)
    .set({ status })
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.status, "pending")))
    .run();
  return result.changes > 0;
}

export async function setOrderSession(
  orderNumber: string,
  paymentSessionId: string,
): Promise<void> {
  await db
    .update(orders)
    .set({ paymentSessionId })
    .where(eq(orders.orderNumber, orderNumber));
}

const ORDER_NUMBER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Human-friendly order number, e.g. "PC-7KQ2M9XW" (crypto randomness). */
export function generateOrderNumber(): string {
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += ORDER_NUMBER_ALPHABET[randomInt(ORDER_NUMBER_ALPHABET.length)];
  }
  return `PC-${suffix}`;
}
