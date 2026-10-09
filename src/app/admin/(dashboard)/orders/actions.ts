"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { orders, ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { redeemDiscountOnOrder } from "@/lib/orders";

/**
 * Admin order-status transition. Any status -> any other status is allowed
 * (a paid order can be refunded to cancelled, a cancelled order re-opened),
 * unlike the public payment flow which only resolves pending orders.
 * A discount redemption is counted the first time an order enters "paid".
 */
export async function setOrderStatus(orderNumber: string, status: string): Promise<void> {
  await requireAdmin();

  if (!ORDER_STATUSES.includes(status as OrderStatus)) return;

  const [order] = await db
    .select({ discountCode: orders.discountCode })
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  if (!order) return;

  await db
    .update(orders)
    .set({ status: status as OrderStatus })
    .where(eq(orders.orderNumber, orderNumber));

  if (status === "paid" && order.discountCode) {
    await redeemDiscountOnOrder(orderNumber, order.discountCode);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);
}
