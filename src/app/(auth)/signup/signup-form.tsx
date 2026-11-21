"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signupAction, type AccountFormState } from "../actions";

const initialState: AccountFormState = {};

export function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.3em] text-zinc-400 uppercase hover:text-zinc-600"
          >
            PC Shop
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Save builds to your profile and pick up where you left off.
          </p>
        </div>

        <form
          action={formAction}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            placeholder="Ada Lovelace"
          />

          <label htmlFor="email" className="mt-4 block text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            placeholder="you@example.com"
          />

          <label htmlFor="password" className="mt-4 block text-sm font-medium text-zinc-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            placeholder="At least 8 characters"
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
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href={`/login${next !== "/build" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-zinc-900 underline hover:text-zinc-600"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
