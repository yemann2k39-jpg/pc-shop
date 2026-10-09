import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/db";
import { products } from "@/db/schema";
import { asc } from "drizzle-orm";

import { BuildClient } from "./build-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "PC Builder" };

export default async function BuildPage() {
  const allProducts = await db
    .select()
    .from(products)
    .orderBy(asc(products.brand), asc(products.model));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
        <Link href="/" className="text-zinc-600 hover:text-zinc-900">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-zinc-800">PC Builder</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          PC Builder
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pick your parts — compatibility, power draw, and price update live.
        </p>
      </div>

      <BuildClient products={allProducts} />
    </div>
  );
}
