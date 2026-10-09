import Link from "next/link";
import type { ReactNode } from "react";

import { logout } from "@/app/admin/login/actions";

import { AdminNav } from "../_components/admin-nav";

/** Shell for authenticated admin pages (guarded by src/proxy.ts). */
export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-zinc-950">
        <div className="px-6 pt-6 pb-5">
          <Link href="/" className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase hover:text-zinc-300">
            PC Shop
          </Link>
          <p className="mt-1 text-lg font-bold tracking-tight text-white">Admin</p>
        </div>
        <AdminNav />
        <div className="mt-auto border-t border-white/10 p-4">
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
          >
            ← View shop
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-red-400"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
      </div>
    </div>
  );
}
