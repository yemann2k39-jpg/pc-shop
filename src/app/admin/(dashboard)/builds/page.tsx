import { inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/db";
import { products } from "@/db/schema";
import { listRecentBuilds } from "@/lib/builds";

import { DeleteBuildButton } from "./delete-build-button";

export const metadata = { title: "Builds" };
export const dynamic = "force-dynamic";

/** Count of parts actually found in the catalog (items re-hydrate at render). */
async function resolvePartCounts(buildsList: Awaited<ReturnType<typeof listRecentBuilds>>) {
  const slugs = new Set<string>();
  for (const build of buildsList) {
    for (const slug of Object.values(build.items)) slugs.add(slug);
  }
  const rows = slugs.size
    ? await db.select({ slug: products.slug }).from(products).where(inArray(products.slug, [...slugs]))
    : [];
  const known = new Set(rows.map((row) => row.slug));
  return new Map(
    buildsList.map((build) => {
      const values = Object.values(build.items);
      const found = values.filter((slug) => known.has(slug)).length;
      return [build.publicId, `${found}/${values.length} parts`];
    }),
  );
}

export default async function AdminBuildsPage() {
  const buildsList = await listRecentBuilds(100);
  const partCounts = await resolvePartCounts(buildsList);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Saved builds</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {buildsList.length} build{buildsList.length === 1 ? "" : "s"} — public share pages anyone can visit.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              <th className="px-5 py-3">Build</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Contents</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {buildsList.map((build) => (
              <tr key={build.publicId} className="hover:bg-zinc-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-zinc-900">{build.name}</p>
                  <p className="font-mono text-xs text-zinc-400">{build.publicId}</p>
                </td>
                <td className="px-3 py-3 text-zinc-600">{build.ownerName ?? "—"}</td>
                <td className="px-3 py-3 text-zinc-600">
                  {build.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-3 py-3 text-zinc-600">{partCounts.get(build.publicId)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/build/${build.publicId}`}
                      target="_blank"
                      className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      Preview ↗
                    </Link>
                    <DeleteBuildButton publicId={build.publicId} />
                  </div>
                </td>
              </tr>
            ))}
            {buildsList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                  No saved builds yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
