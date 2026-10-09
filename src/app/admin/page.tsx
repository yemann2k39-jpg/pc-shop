import Link from "next/link";

import { logout } from "@/app/admin/login/actions";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

// Placeholder overview — replaced by the full dashboard in the next ticket.
export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Admin dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Signed in. Stats, products, orders, and builds are coming in the next tickets.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            View shop
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
