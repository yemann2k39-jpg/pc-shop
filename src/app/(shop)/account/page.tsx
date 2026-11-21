import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/account-auth";
import { listUserBuilds } from "@/lib/builds";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=%2Faccount");
  }
  const myBuilds = await listUserBuilds(user.id);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">My account</h1>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-500">Signed in as</p>
        <p className="mt-1 text-lg font-semibold text-zinc-900">{user.name}</p>
        <p className="text-sm text-zinc-500">{user.email}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/build"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          Open the builder
        </Link>
        <Link
          href="/builds"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Browse community builds
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
          >
            Sign out
          </button>
        </form>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">My builds</h2>
      {myBuilds.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          No saved builds yet — put one together in the{" "}
          <Link href="/build" className="underline hover:text-zinc-700">
            builder
          </Link>{" "}
          and save it to see it here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {myBuilds.map((build) => (
            <li key={build.id}>
              <Link
                href={`/build/${build.publicId}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-400"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-zinc-900">
                    {build.name}
                  </span>
                  <span className="text-xs text-zinc-400">{build.publicId}</span>
                </span>
                <span className="shrink-0 text-xs text-zinc-400">
                  {build.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
