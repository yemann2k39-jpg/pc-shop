import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-xs font-medium tracking-widest text-accent uppercase">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Page not found
      </h1>
      <p className="max-w-md text-ink-dim">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong/90"
      >
        Back to the shop
      </Link>
    </div>
  );
}
