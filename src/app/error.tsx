"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-xs font-medium tracking-widest text-status-danger uppercase">
        Something went wrong
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        An unexpected error occurred
      </h1>
      <p className="max-w-md text-ink-dim">
        Try again, and if the problem persists, reload the page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong/90"
      >
        Try again
      </button>
      {error.digest ? (
        <p className="text-xs text-ink-faint">Error ID: {error.digest}</p>
      ) : null}
    </div>
  );
}
