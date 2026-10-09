import type { OrderStatus } from "@/db/schema";

/** Shared status chip styles for order status badges. */
export const STATUS_BADGES: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};
