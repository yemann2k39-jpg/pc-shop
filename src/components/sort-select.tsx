"use client";

import { useRouter } from "next/navigation";

/**
 * Sort dropdown for category listings. Preserves active filter params,
 * resets to page 1, and always persists the chosen sort so the server
 * (default: best-selling) cannot silently ignore it.
 */
export function SortSelect({
  slug,
  sort,
  params,
}: {
  slug: string;
  sort: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();

  const change = (value: string) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "sort" || key === "page") continue;
      const items = Array.isArray(value) ? value : value !== undefined ? [value] : [];
      for (const item of items) {
        if (item !== "") search.append(key, item);
      }
    }
    if (value) search.set("sort", value);
    const qs = search.toString();
    router.push(qs ? `/category/${slug}?${qs}` : `/category/${slug}`);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-500">
      Sort by
      <select
        value={sort}
        onChange={(event) => change(event.target.value)}
        aria-label="Sort products"
        className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 focus:border-zinc-900 focus:outline-none"
      >
        <option value="best-selling">Best selling</option>
        <option value="name">Name</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
    </label>
  );
}
