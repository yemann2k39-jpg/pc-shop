"use client";

import Link from "next/link";
import { useActionState } from "react";

import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xs font-semibold tracking-[0.3em] text-zinc-400 uppercase hover:text-zinc-600">
            PC Shop
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">Admin sign in</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Restricted area — staff only.</p>
        </div>

        <form action={formAction} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
            Admin password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            placeholder="••••••••"
          />
          <input type="hidden" name="next" value={next} />

          {state.error ? (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-5 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          <Link href="/" className="hover:text-zinc-600">
            ← Back to the shop
          </Link>
        </p>
      </div>
    </div>
  );
}
