import Link from "next/link";

import { logoutAction } from "@/app/(auth)/actions";
import { CartLink } from "@/components/cart-link";
import { CategoriesMenu } from "@/components/categories-menu";
import { getCurrentUser } from "@/lib/account-auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          PC<span className="text-blue-700">Shop</span>
        </Link>

        {/* Prominent builder CTA */}
        <Link
          href="/build"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-700 hover:shadow-md"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
            />
          </svg>
          Builder
        </Link>

        <Link
          href="/builds"
          className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          Builds
        </Link>

        <CategoriesMenu />

        <div className="flex-1" />

        <form action="/search" role="search" className="flex shrink-0 items-center gap-1">
          <input
            type="search"
            name="q"
            placeholder="Search parts…"
            aria-label="Search products"
            className="w-36 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-900 focus:outline-none md:w-52"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="rounded-full border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="m13.2 13.2 3.6 3.6" />
            </svg>
          </button>
        </form>
        {user ? (
          <>
            <Link
              href="/account"
              className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              {user.name.split(" ")[0]}
            </Link>
            <form action={logoutAction} className="shrink-0">
              <button
                type="submit"
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login?next=%2Fbuild"
            className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Sign in
          </Link>
        )}
        <CartLink />
      </div>
    </header>
  );
}
