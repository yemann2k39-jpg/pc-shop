import type { Metadata } from "next";
import Link from "next/link";

import { listRecentBuilds } from "@/lib/builds";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Community builds" };

export default async function BuildsPage() {
  const builds = await listRecentBuilds();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
        <Link href="/" className="text-zinc-600 hover:text-zinc-900">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-medium text-zinc-800">Community builds</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Community builds
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Builds saved by visitors — open one to see parts, compatibility,
            and performance, then fork it into the builder.
          </p>
        </div>
        <Link
          href="/build"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Open the builder
        </Link>
      </div>

      {builds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="font-medium text-zinc-700">No builds yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Be the first — build a PC in the builder and hit save.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((build) => (
            <li key={build.id}>
              <Link
                href={`/build/${build.publicId}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <p className="font-mono text-xs text-zinc-400">
                  {build.publicId}
                </p>
                <h2 className="mt-1 font-semibold text-zinc-900">
                  {build.name}
                </h2>
                {build.ownerName ? (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    by {build.ownerName}
                  </p>
                ) : null}
                {build.note ? (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                    {build.note}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-zinc-400">
                  {new Date(build.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
