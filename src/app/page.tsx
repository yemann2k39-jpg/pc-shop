export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-32 text-center">
      <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-700 uppercase">
        PC Shop
      </span>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        PC components, minus the guesswork.
      </h1>
      <p className="max-w-md text-lg text-zinc-600">
        The catalog is being stocked right now. Browsing, product pages, search,
        cart, and checkout arrive in the next tickets.
      </p>
    </div>
  );
}
