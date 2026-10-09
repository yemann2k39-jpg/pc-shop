"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { builds } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function deleteBuild(publicId: string): Promise<void> {
  await requireAdmin();

  if (!/^BD-[A-Z2-9]{8}$/.test(publicId)) return;

  await db.delete(builds).where(eq(builds.publicId, publicId));

  revalidatePath("/admin/builds");
  revalidatePath("/builds");
  revalidatePath(`/build/${publicId}`);
}
