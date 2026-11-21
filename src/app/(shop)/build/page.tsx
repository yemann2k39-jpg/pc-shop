import type { Metadata } from "next";
import Link from "next/link";
import { asc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { benchmarkData, products } from "@/db/schema";
import { getBuildByPublicId } from "@/lib/builds";
import { buildBenchmarkLookup } from "@/lib/performance";

import { BuildClient } from "./build-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "PC Builder" };

export default async function BuildPage({
  searchParams,
}: PageProps<"/build">) {
  const query = await searchParams;
  const fromParam = query.from;
  const fromId = Array.isArray(fromParam) ? fromParam[0] : fromParam;

  // Fork support: pre-select the parts of a saved community build.
  let initialSelection: Record<string, typeof products.$inferSelect> | undefined;
  if (fromId) {
    const build = await getBuildByPublicId(fromId);
    if (build) {
      const rows = await db
        .select()
        .from(products)
        .where(inArray(products.slug, Object.values(build.items)));
      initialSelection = Object.fromEntries(
        rows
          .filter((product) => build.items[product.category] === product.slug)
          .map((product) => [product.category, product]),
      );
    }
  }

  const allProducts = await db
    .select()
    .from(products)
    .orderBy(asc(products.brand), asc(products.model));

  const benchmarks = buildBenchmarkLookup(await db.select().from(benchmarkData));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
        <Link href="/" className="text-zinc-600 hover:text-zinc-900">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-zinc-800">PC Builder</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            PC Builder
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pick your parts — compatibility, power draw, and price update live.
          </p>
        </div>
        <Link
          href="/builds"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Community builds
        </Link>
      </div>

      <BuildClient
        products={allProducts}
        initialSelection={initialSelection}
        benchmarks={benchmarks}
      />
    </div>
  );
}
