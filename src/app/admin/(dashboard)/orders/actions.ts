"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { orders, ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

/**
 * Admin order-status transition. Any status -> any other status is allowed
 * (a paid order can be refunded to cancelled, a cancelled order re-opened),
 * unlike the public payment flow which only resolves pending orders.
 */
export async function setOrderStatus(orderNumber: string, status: string): Promise<void> {
  await requireAdmin();

  if (!ORDER_STATUSES.includes(status as OrderStatus)) return;

  await db
    .update(orders)
    .set({ status: status as OrderStatus })
    .where(eq(orders.orderNumber, orderNumber));

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);
}
