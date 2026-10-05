"use client";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-xs font-medium tracking-widest text-red-600 uppercase">
        Something went wrong
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        An unexpected error occurred
      </h1>
      <p className="max-w-md text-zinc-600">
        Try again, and if the problem persists, reload the page.
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Try again
      </button>
      {error.digest ? (
        <p className="text-xs text-zinc-400">Error ID: {error.digest}</p>
      ) : null}
    </div>
  );
}
