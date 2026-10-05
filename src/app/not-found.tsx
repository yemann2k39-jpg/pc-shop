import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-xs font-medium tracking-widest text-blue-700 uppercase">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        Page not found
      </h1>
      <p className="max-w-md text-zinc-600">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Back to the shop
      </Link>
    </div>
  );
}
