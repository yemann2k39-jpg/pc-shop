import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { products, type Product } from "@/db/schema";
import { AddBuildToCart } from "@/components/add-build-to-cart";
import { getCategory } from "@/lib/catalog";
import { formatPrice, STOCK_LABELS } from "@/lib/format";
import { getBuildByPublicId } from "@/lib/builds";
import { checkCompatibility } from "@/lib/compatibility";
import { estimateForBuild } from "@/lib/performance";

export const dynamic = "force-dynamic";

type BuildPageProps = PageProps<"/build/[publicId]">;

export async function generateMetadata({
  params,
}: BuildPageProps): Promise<Metadata> {
  const { publicId } = await params;
  const build = await getBuildByPublicId(publicId);
  if (!build) return { title: "Build not found" };
  return { title: build.name };
}

export default async function BuildDetailPage({ params }: BuildPageProps) {
  const { publicId } = await params;
  const build = await getBuildByPublicId(publicId);
  if (!build) notFound();

  const slugs = Object.values(build.items);
  const selected = (
    await db.select().from(products).where(inArray(products.slug, slugs))
  ).filter((product) => build.items[product.category] === product.slug);
  const missingSlugs = slugs.filter(
    (slug) => !selected.some((product) => product.slug === slug),
  );

  const selection: Partial<Record<string, Product>> = {};
  for (const product of selected) selection[product.category] = product;

  const findings = checkCompatibility(selection);
  const perf = estimateForBuild(selection);
  const totalCents = selected.reduce((sum, p) => sum + p.priceCents, 0);
  const complete = Object.keys(selection).length === slugs.length;
  const cartParts = selected.map((product) => ({
    category: product.category,
    slug: product.slug,
    brand: product.brand,
    model: product.model,
    imageUrl: product.imageUrl,
    priceCents: product.priceCents,
    inStock: product.stockStatus !== "out_of_stock",
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
        <Link href="/" className="text-zinc-600 hover:text-zinc-900">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/builds" className="text-zinc-600 hover:text-zinc-900">
          Community builds
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-zinc-800">{build.publicId}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-zinc-400">{build.publicId}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {build.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {build.ownerName ? `by ${build.ownerName} · ` : ""}
            {new Date(build.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <Link
          href={`/build?from=${build.publicId}`}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Fork into builder
        </Link>
      </div>

      {build.note ? (
        <p className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          {build.note}
        </p>
      ) : null}

      {missingSlugs.length > 0 ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Some parts of this build are no longer in the catalog
          ({missingSlugs.length === 1 ? "1 part" : `${missingSlugs.length} parts`} missing)
          — the list below shows the remaining parts.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Parts */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white">
            <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900">
              Parts
            </h2>
            <ul className="divide-y divide-zinc-100">
              {selected.length === 0 ? (
                <li className="px-4 py-3 text-sm text-zinc-500">
                  This build has no parts.
                </li>
              ) : (
                selected.map((product) => {
                  const category = getCategory(product.category);
                  return (
                    <li key={product.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                        <Image
                          src={product.imageUrl}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
                          {category?.name ?? product.category}
                        </p>
                        <Link
                          href={`/product/${product.slug}`}
                          className="truncate text-sm font-medium text-zinc-900 hover:text-blue-700"
                        >
                          {product.brand} {product.model}
                        </Link>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-900">
                          {formatPrice(product.priceCents)}
                        </p>
                        <p
                          className={`text-[11px] ${
                            product.stockStatus === "in_stock"
                              ? "text-emerald-600"
                              : product.stockStatus === "low_stock"
                                ? "text-amber-600"
                                : "text-zinc-400"
                          }`}
                        >
                          {STOCK_LABELS[product.stockStatus]}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="flex justify-between border-t border-zinc-200 px-4 py-3 text-base font-bold text-zinc-900">
              <span>Total</span>
              <span>{formatPrice(totalCents)}</span>
            </div>
            <div className="px-4 pb-4">
              <AddBuildToCart parts={cartParts} />
            </div>
          </div>

          {/* Compatibility */}
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white">
            <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900">
              Compatibility report
            </h2>
            <ul className="divide-y divide-zinc-100">
              {findings.length === 0 ? (
                <li className="px-4 py-3 text-sm text-emerald-700">
                  No compatibility problems detected.
                </li>
              ) : (
                findings.map((finding) => (
                  <li key={finding.rule} className="px-4 py-2.5 text-sm">
                    <span
                      className={`mr-2 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        finding.severity === "error"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : finding.severity === "warning"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500"
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-zinc-700">{finding.message}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Performance */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white">
            <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900">
              Estimated performance
            </h2>
            {!perf.complete ? (
              <p className="px-4 py-3 text-sm text-zinc-500">
                Select all parts to unlock FPS estimates.
              </p>
            ) : (
              perf.scenarios.map((scenario) => (
                <div key={scenario.name} className="border-b border-zinc-100 px-4 py-3 last:border-b-0">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    {scenario.name}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {scenario.estimates.map((estimate) => (
                      <li key={estimate.resolution} className="flex justify-between">
                        <span className="text-zinc-500">{estimate.resolution}</span>
                        <span className="font-medium text-zinc-900">
                          ~{estimate.fpsLow}–{estimate.fpsHigh} fps
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
            <p className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-400">
              {complete
                ? "Estimates from relative benchmark data; actual results vary by game and settings."
                : missingSlugs.length > 0
                  ? "Incomplete build — some parts are no longer in the catalog."
                  : "Incomplete build — add every part in the builder to unlock estimates."}
            </p>
          </div>

          <Link
            href="/builds"
            className="block rounded-lg border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            More community builds
          </Link>
        </div>
      </div>
    </div>
  );
}
